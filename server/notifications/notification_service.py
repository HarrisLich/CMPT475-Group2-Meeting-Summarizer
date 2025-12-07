"""
Notification Service Module

Handles sending notifications via:
- Email (SMTP or SendGrid)
- Slack (Webhooks)
"""

import os
import smtplib
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
        if self.email_provider == "sendgrid" and self.sendgrid_api_key:
            return self._send_via_sendgrid(to_email, subject, body_html, body_text)
        else:
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
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {self.sendgrid_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "personalizations": [{
                    "to": [{"email": to_email}]
                }],
                "from": {"email": self.from_email},
                "subject": subject,
                "content": [
                    {
                        "type": "text/html",
                        "value": body_html
                    }
                ]
            }
            
            if body_text:
                payload["content"].append({
                    "type": "text/plain",
                    "value": body_text
                })
            
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            return {"success": True, "message": "Email sent via SendGrid"}
        
        except Exception as e:
            return {"success": False, "error": f"SendGrid send failed: {str(e)}"}
    
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
                slack_message = {
                    "text": f"📋 Action Item Assigned: {action_item.get('task', '')}",
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
                                "text": f"*Task:* {action_item.get('task', '')}\n*Priority:* {action_item.get('priority', 'medium').upper()}\n*Assigned to:* {slack_user_id}"
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
        results = {
            "email_sent": False,
            "slack_sent": False,
            "errors": []
        }
        
        # Send email if contact has email
        if contact.get("email"):
            subject = f"Action Item: {action_item.get('task', 'New Task')}"
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
            else:
                results["errors"].append(f"Email: {email_result.get('error')}")
        
        # Send Slack if contact has Slack ID
        if contact.get("slack_user_id"):
            slack_result = self.send_slack_message(
                slack_user_id=contact["slack_user_id"],
                message=f"New action item: {action_item.get('task', '')}",
                action_item=action_item
            )
            
            if slack_result["success"]:
                results["slack_sent"] = True
            else:
                results["errors"].append(f"Slack: {slack_result.get('error')}")
        
        return results
    
    def _format_action_item_email(
        self, 
        action_item: Dict, 
        contact: Dict
    ) -> str:
        """Format HTML email for action item."""
        priority_colors = {
            "high": "#FF4444",
            "medium": "#FFA500",
            "low": "#4CAF50"
        }
        priority = action_item.get("priority", "medium")
        color = priority_colors.get(priority, "#666")
        
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">📋 New Action Item Assigned</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">{action_item.get('task', 'New Task')}</h3>
                <p><strong>Priority:</strong> <span style="color: {color}; font-weight: bold;">{priority.upper()}</span></p>
                <p><strong>Assigned to:</strong> {contact.get('name', 'You')}</p>
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
        """Format plain text email for action item."""
        return f"""
New Action Item Assigned

Task: {action_item.get('task', 'New Task')}
Priority: {action_item.get('priority', 'medium').upper()}
Assigned to: {contact.get('name', 'You')}

This action item was extracted from a meeting processed by SumurAI.
        """

