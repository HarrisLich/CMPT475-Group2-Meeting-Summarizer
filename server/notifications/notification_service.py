"""
Notification Service Module

Handles sending notifications via:
- Email (SMTP or SendGrid)
- Slack (Webhooks)
"""

import os
import smtplib
import html
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class NotificationService:
    """
    Service for sending notifications via email and Slack.
    
    Supports:
    - Email via SMTP or SendGrid API
    - Slack via Webhooks
    """
    
    def __init__(self):
        # Email configuration
        self.email_provider = os.getenv("EMAIL_PROVIDER", "smtp")  # "smtp" or "sendgrid"
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@sumurai.app")
        
        # SendGrid (alternative)
        self.sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
        
        # Slack configuration
        self.slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        
        # Log configuration on startup
        print(f"[NOTIFICATION SERVICE] 🔧 Initializing Notification Service...")
        print(f"[NOTIFICATION SERVICE]   Email Provider: {self.email_provider}")
        print(f"[NOTIFICATION SERVICE]   From Email: {self.from_email}")
        
        if self.email_provider == "sendgrid":
            if self.sendgrid_api_key:
                masked_key = f"{self.sendgrid_api_key[:10]}...{self.sendgrid_api_key[-4:]}" if len(self.sendgrid_api_key) > 14 else "***"
                print(f"[NOTIFICATION SERVICE]   SendGrid API Key: {masked_key} ✓")
            else:
                print(f"[NOTIFICATION SERVICE]   ⚠️  SendGrid API Key: NOT SET")
        else:
            print(f"[NOTIFICATION SERVICE]   SMTP Host: {self.smtp_host}")
            print(f"[NOTIFICATION SERVICE]   SMTP Port: {self.smtp_port}")
            if self.smtp_user:
                print(f"[NOTIFICATION SERVICE]   SMTP User: {self.smtp_user} ✓")
            else:
                print(f"[NOTIFICATION SERVICE]   ⚠️  SMTP User: NOT SET")
        
        if self.slack_webhook_url:
            print(f"[NOTIFICATION SERVICE]   Slack Webhook: Configured ✓")
        else:
            print(f"[NOTIFICATION SERVICE]   Slack Webhook: NOT SET")
    
    def _escape_html(self, text: str) -> str:
        """
        Escape HTML special characters to prevent XSS/injection.
        
        Args:
            text: Text to escape
        
        Returns:
            Escaped text safe for HTML embedding
        """
        if not text:
            return ""
        return html.escape(str(text), quote=True)
    
    def _escape_slack(self, text: str) -> str:
        """
        Escape Slack markdown special characters.
        
        Args:
            text: Text to escape
        
        Returns:
            Escaped text safe for Slack messages
        """
        if not text:
            return ""
        # Escape Slack markdown special characters: < > & 
        text = str(text)
        text = text.replace("&", "&amp;")
        text = text.replace("<", "&lt;")
        text = text.replace(">", "&gt;")
        return text
    
    def _sanitize_subject(self, text: str) -> str:
        """
        Sanitize email subject line by removing newlines and excessive whitespace.
        
        Args:
            text: Text to sanitize
        
        Returns:
            Sanitized text safe for email subject
        """
        if not text:
            return ""
        # Remove newlines and carriage returns
        text = re.sub(r'[\r\n]+', ' ', str(text))
        # Collapse multiple spaces
        text = re.sub(r'\s+', ' ', text)
        # Limit length to prevent email client issues
        return text.strip()[:200]
    
    def send_email(
        self, 
        to_email: str, 
        subject: str, 
        body_html: str,
        body_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send email notification.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body_html: HTML email body
            body_text: Plain text version (optional)
        
        Returns:
            Dict with success status and message
        """
        print(f"[EMAIL] 📧 Sending email notification...")
        print(f"[EMAIL]   Provider: {self.email_provider}")
        print(f"[EMAIL]   To: {to_email}")
        print(f"[EMAIL]   Subject: {subject}")
        
        if self.email_provider == "sendgrid" and self.sendgrid_api_key:
            print(f"[EMAIL]   Using SendGrid provider")
            return self._send_via_sendgrid(to_email, subject, body_html, body_text)
        else:
            print(f"[EMAIL]   Using SMTP provider")
            if self.email_provider == "sendgrid" and not self.sendgrid_api_key:
                print(f"[EMAIL]   ⚠️  WARNING: EMAIL_PROVIDER is 'sendgrid' but SENDGRID_API_KEY is not set!")
            return self._send_via_smtp(to_email, subject, body_html, body_text)
    
    def _send_via_smtp(
        self, 
        to_email: str, 
        subject: str, 
        body_html: str,
        body_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send email via SMTP."""
        try:
            if not self.smtp_user or not self.smtp_password:
                return {
                    "success": False,
                    "error": "SMTP credentials not configured"
                }
            
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email
            
            # Add text and HTML parts
            if body_text:
                text_part = MIMEText(body_text, "plain")
                msg.attach(text_part)
            
            html_part = MIMEText(body_html, "html")
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            return {"success": True, "message": "Email sent successfully"}
        
        except Exception as e:
            return {"success": False, "error": f"Email send failed: {str(e)}"}
    
    def _send_via_sendgrid(
        self, 
        to_email: str, 
        subject: str, 
        body_html: str,
        body_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send email via SendGrid API."""
        try:
            # Log configuration check
            if not self.sendgrid_api_key:
                print("[SENDGRID] ❌ ERROR: SENDGRID_API_KEY not configured")
                return {"success": False, "error": "SendGrid API key not configured"}
            
            if not self.from_email:
                print("[SENDGRID] ❌ ERROR: FROM_EMAIL not configured")
                return {"success": False, "error": "From email not configured"}
            
            print(f"[SENDGRID] 📧 Attempting to send email...")
            print(f"[SENDGRID]   To: {to_email}")
            print(f"[SENDGRID]   From: {self.from_email}")
            print(f"[SENDGRID]   Subject: {subject}")
            print(f"[SENDGRID]   API Key: {self.sendgrid_api_key[:10]}...{self.sendgrid_api_key[-4:] if len(self.sendgrid_api_key) > 14 else '***'}")
            
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {self.sendgrid_api_key}",
                "Content-Type": "application/json"
            }
            
            # Build content array - SendGrid requires text/plain FIRST, then text/html
            content = []
            if body_text:
                content.append({
                    "type": "text/plain",
                    "value": body_text
                })
            content.append({
                "type": "text/html",
                "value": body_html
            })
            
            payload = {
                "personalizations": [{
                    "to": [{"email": to_email}]
                }],
                "from": {"email": self.from_email},
                "subject": subject,
                "content": content
            }
            
            print(f"[SENDGRID] 📤 Sending request to SendGrid API...")
            response = requests.post(url, json=payload, headers=headers)
            
            # Log response details
            print(f"[SENDGRID] 📥 Response status: {response.status_code}")
            
            if response.status_code >= 400:
                error_body = response.text
                print(f"[SENDGRID] ❌ ERROR Response Body: {error_body}")
                
                # Try to parse error details
                try:
                    error_json = response.json()
                    if "errors" in error_json:
                        for error in error_json["errors"]:
                            print(f"[SENDGRID] ❌ Error Detail: {error.get('message', 'Unknown error')}")
                except:
                    pass
                
                return {
                    "success": False, 
                    "error": f"SendGrid API error ({response.status_code}): {error_body}"
                }
            
            response.raise_for_status()
            print(f"[SENDGRID] ✅ Email sent successfully to {to_email}")
            return {"success": True, "message": "Email sent via SendGrid"}
        
        except requests.exceptions.RequestException as e:
            error_msg = f"SendGrid request failed: {str(e)}"
            print(f"[SENDGRID] ❌ REQUEST ERROR: {error_msg}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"[SENDGRID] ❌ Response Status: {e.response.status_code}")
                print(f"[SENDGRID] ❌ Response Body: {e.response.text}")
            return {"success": False, "error": error_msg}
        except Exception as e:
            error_msg = f"SendGrid send failed: {str(e)}"
            print(f"[SENDGRID] ❌ EXCEPTION: {error_msg}")
            import traceback
            print(f"[SENDGRID] ❌ Traceback: {traceback.format_exc()}")
            return {"success": False, "error": error_msg}
    
    def send_slack_message(
        self, 
        slack_user_id: str, 
        message: str,
        action_item: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send Slack notification.
        
        Args:
            slack_user_id: Slack user ID or channel (e.g., "@john.doe" or "#general")
            message: Message text
            action_item: Optional action item data for rich formatting
        
        Returns:
            Dict with success status
        """
        if not self.slack_webhook_url:
            return {
                "success": False,
                "error": "Slack webhook URL not configured"
            }
        
        try:
            # Format message with action item details
            if action_item:
                # Escape all user input for Slack
                task_text = self._escape_slack(action_item.get('task', ''))
                priority_text = self._escape_slack(action_item.get('priority', 'medium').upper())
                assigned_text = self._escape_slack(slack_user_id)
                
                slack_message = {
                    "text": f"📋 Action Item Assigned: {task_text}",
                    "blocks": [
                        {
                            "type": "header",
                            "text": {
                                "type": "plain_text",
                                "text": "📋 New Action Item"
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": f"*Task:* {task_text}\n*Priority:* {priority_text}\n*Assigned to:* {assigned_text}"
                            }
                        }
                    ]
                }
            else:
                slack_message = {"text": message}
            
            response = requests.post(
                self.slack_webhook_url,
                json=slack_message,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            return {"success": True, "message": "Slack message sent"}
        
        except Exception as e:
            return {"success": False, "error": f"Slack send failed: {str(e)}"}
    
    def notify_action_item(
        self,
        action_item: Dict[str, Any],
        contact: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Send notifications for an action item to a contact.
        
        Args:
            action_item: Action item data (task, priority, etc.)
            contact: Contact data (email, slack_user_id, etc.)
        
        Returns:
            Dict with notification results
        """
        print(f"[NOTIFICATION] 🔔 Starting notification for action item...")
        print(f"[NOTIFICATION]   Action Item: {action_item.get('task', 'Unknown task')}")
        print(f"[NOTIFICATION]   Priority: {action_item.get('priority', 'medium')}")
        print(f"[NOTIFICATION]   Contact: {contact.get('name', 'Unknown')} (ID: {contact.get('id', 'N/A')})")
        print(f"[NOTIFICATION]   Contact Email: {contact.get('email', 'N/A')}")
        print(f"[NOTIFICATION]   Contact Slack: {contact.get('slack_user_id', 'N/A')}")
        
        results = {
            "email_sent": False,
            "slack_sent": False,
            "errors": []
        }
        
        # Send email if contact has email
        if contact.get("email"):
            print(f"[NOTIFICATION] 📧 Contact has email, attempting to send email...")
            # Sanitize subject line
            task_text = action_item.get('task', 'New Task')
            subject = f"Action Item: {self._sanitize_subject(task_text)}"
            body_html = self._format_action_item_email(action_item, contact)
            body_text = self._format_action_item_email_text(action_item, contact)
            
            email_result = self.send_email(
                to_email=contact["email"],
                subject=subject,
                body_html=body_html,
                body_text=body_text
            )
            
            if email_result["success"]:
                results["email_sent"] = True
                print(f"[NOTIFICATION] ✅ Email sent successfully")
            else:
                error_msg = email_result.get('error', 'Unknown error')
                results["errors"].append(f"Email: {error_msg}")
                print(f"[NOTIFICATION] ❌ Email failed: {error_msg}")
        else:
            print(f"[NOTIFICATION] ⚠️  Contact does not have an email address, skipping email notification")
        
        # Send Slack if contact has Slack ID
        if contact.get("slack_user_id"):
            print(f"[NOTIFICATION] 💬 Contact has Slack ID, attempting to send Slack message...")
            # Escape task text for Slack message
            task_text = self._escape_slack(action_item.get('task', ''))
            slack_result = self.send_slack_message(
                slack_user_id=contact["slack_user_id"],
                message=f"New action item: {task_text}",
                action_item=action_item
            )
            
            if slack_result["success"]:
                results["slack_sent"] = True
                print(f"[NOTIFICATION] ✅ Slack message sent successfully")
            else:
                error_msg = slack_result.get('error', 'Unknown error')
                results["errors"].append(f"Slack: {error_msg}")
                print(f"[NOTIFICATION] ❌ Slack failed: {error_msg}")
        else:
            print(f"[NOTIFICATION] ⚠️  Contact does not have a Slack ID, skipping Slack notification")
        
        print(f"[NOTIFICATION] 📊 Notification Results:")
        print(f"[NOTIFICATION]   Email Sent: {results['email_sent']}")
        print(f"[NOTIFICATION]   Slack Sent: {results['slack_sent']}")
        if results["errors"]:
            print(f"[NOTIFICATION]   Errors: {', '.join(results['errors'])}")
        
        return results
    
    def _format_action_item_email(
        self, 
        action_item: Dict, 
        contact: Dict
    ) -> str:
        """Format HTML email for action item with proper escaping."""
        priority_colors = {
            "high": "#FF4444",
            "medium": "#FFA500",
            "low": "#4CAF50"
        }
        priority = action_item.get("priority", "medium")
        color = priority_colors.get(priority, "#666")
        
        # Escape all user input to prevent HTML/JS injection
        task_text = self._escape_html(action_item.get('task', 'New Task'))
        priority_text = self._escape_html(priority.upper())
        contact_name = self._escape_html(contact.get('name', 'You'))
        
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">📋 New Action Item Assigned</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">{task_text}</h3>
                <p><strong>Priority:</strong> <span style="color: {color}; font-weight: bold;">{priority_text}</span></p>
                <p><strong>Assigned to:</strong> {contact_name}</p>
            </div>
            <p style="color: #666; font-size: 14px;">
                This action item was extracted from a meeting processed by SumurAI.
            </p>
        </body>
        </html>
        """
    
    def _format_action_item_email_text(
        self, 
        action_item: Dict, 
        contact: Dict
    ) -> str:
        """Format plain text email for action item with sanitization."""
        # For plain text, remove newlines and excessive whitespace to prevent email injection
        task_text = self._sanitize_subject(action_item.get('task', 'New Task'))
        priority_text = action_item.get('priority', 'medium').upper()
        contact_name = self._sanitize_subject(contact.get('name', 'You'))
        
        return f"""
New Action Item Assigned

Task: {task_text}
Priority: {priority_text}
Assigned to: {contact_name}

This action item was extracted from a meeting processed by SumurAI.
        """

