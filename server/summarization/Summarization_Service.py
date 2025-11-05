"""
Summarization Service Module

This module provides AI-powered summarization of meeting transcriptions using LOCAL Ollama.
All operations (summarization, chat, action items) run on your machine - unlimited and free.
"""

import os
from typing import Dict, Any
import requests
from dotenv import load_dotenv
import json

# Load environment variables from .env file
load_dotenv()


class SummarizationService:
    """
    Ollama-based summarization service for meeting transcriptions.

    All AI operations run locally - no cloud API calls, completely unlimited.

    Attributes:
        ollama_host (str): The URL where Ollama is running (default: http://localhost:11434)
        model (str): The Ollama model to use (default: llama3.2:1b for speed)
    """

    # Default prompt template for summarization
    DEFAULT_PROMPT_TEMPLATE = """You are a meeting summarization assistant. Analyze the meeting transcription below and create a well-structured summary.

Meeting Transcription:
{transcription_text}

CRITICAL FORMATTING REQUIREMENTS:

1. **Main Title (##)**: Create a descriptive title that captures what the meeting was about
   - Examples: "## Q4 Product Roadmap Planning", "## Engineering Team Sprint Retrospective", "## Client Onboarding Discussion"
   - DO NOT use the words "Meeting Summary" or "Summary" in the title
   - Make it specific to THIS meeting's content
   - DO NOT use the words "Meeting Summary" or "Summary" in the title

2. **Content Sections (###)**: Include these sections:
   - ### Key Takeaways (bullet points of main insights)
   - ### Action Items (numbered list of tasks)
   - ### Main Topics Covered (5-10 sentences of discussion details)

3. **Markdown Styling**:
   - Use **bold** for important information
   - Use - for bullet points
   - Use 1. 2. 3. for numbered lists
   - Use empty lines between sections
   - Keep a professional, analytical tone

Remember: The ## heading should be a SPECIFIC title about the meeting content, NOT "Summary"."""

    def __init__(self):
        """
        Initialize the SummarizationService with Ollama.

        Reads configuration from environment variables:
        - OLLAMA_HOST: Where Ollama is running (e.g., http://localhost:11434)
        - OLLAMA_MODEL: Which AI model to use (e.g., llama3.2:1b, llama3.2)
        """
        self.ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
        self.prompt_template = self.DEFAULT_PROMPT_TEMPLATE

    def summarize_transcription(self, transcription_text: str) -> Dict[str, Any]:
        """
        Summarize a meeting transcription using LOCAL Ollama.

        Args:
            transcription_text (str): The full text transcription of the meeting

        Returns:
            Dict[str, Any]: A dictionary containing:
                - success (bool): Whether the summarization was successful
                - summary (str): The AI-generated summary (if successful)
                - model_used (str): Which model was used
                - transcription_length (int): Length of the input text
                - error (str): Error message (if failed)
        """
        # Format the prompt with the transcription text
        prompt = self.prompt_template.format(transcription_text=transcription_text)

        try:
            # Send POST request to LOCAL Ollama's chat API endpoint (v0.12+)
            response = requests.post(
                f"{self.ollama_host}/api/chat",
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "stream": False  # Get full response at once
                },
                timeout=300  # 5 minute timeout for long transcriptions
            )

            # Raise exception if HTTP request failed
            response.raise_for_status()

            # Parse JSON response from Ollama
            result = response.json()

            # Extract message content from chat response
            message = result.get("message", {})
            summary_text = message.get("content", "")

            return {
                "success": True,
                "summary": summary_text,
                "model_used": self.model,
                "transcription_length": len(transcription_text)
            }

        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "error": "Could not connect to Ollama. Make sure Ollama is running on your machine.",
                "hint": "Run 'ollama serve' in a terminal"
            }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Summarization timed out. The transcription might be too long."
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Summarization failed: {str(e)}"
            }

    def chat_about_meeting(self, meeting_context: str, user_question: str) -> Dict[str, Any]:
        """
        Have a conversational interaction about a meeting using LOCAL Ollama.

        Args:
            meeting_context (str): The meeting summary or transcription for context
            user_question (str): The user's question or message

        Returns:
            Dict[str, Any]: A dictionary containing:
                - success (bool): Whether the chat was successful
                - response (str): The AI's conversational response
                - model_used (str): Which model was used
                - error (str): Error message (if failed)
        """
        # Create conversational prompt for Ollama
        prompt = f"""You are a professional, analytical, and helpful meeting assistant AI named SumurAI. You help users understand and interact with their meeting content.

            You have access to the full meeting transcription with timestamps. When users ask about specific times or moments, reference the timestamps to 
            provide accurate information. When users ask about what was said about a topic or person, search through the transcription for relevant mentions.

    Meeting Context:
    {meeting_context}

    User: {user_question}

    SumurAI Assistant: """

        try:
            # Send POST request to LOCAL Ollama's chat API (v0.12+)
            response = requests.post(
                f"{self.ollama_host}/api/chat",
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "stream": False
                },
                timeout=120  # 2 minute timeout for chat
            )

            response.raise_for_status()
            result = response.json()

            # Extract message content from chat response
            message = result.get("message", {})
            response_text = message.get("content", "")

            return {
                "success": True,
                "response": response_text,
                "model_used": self.model
            }

        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "error": "Could not connect to Ollama. Make sure Ollama is running on your machine."
            }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Request timed out. Please try again."
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Chat failed: {str(e)}"
            }

    def extract_action_items(self, transcription_text: str) -> Dict[str, Any]:
        """
        Extract detailed action items from a meeting transcription using LOCAL Ollama.

        Args:
            transcription_text (str): The meeting transcription text

        Returns:
            Dict[str, Any]: A dictionary containing:
                - success (bool): Whether the extraction was successful
                - action_items (list): List of action item dictionaries with:
                    - task (str): Description of the action item
                    - priority (str): "high", "medium", or "low"
                    - assigned_to (str): Person responsible
                - model_used (str): Which model was used
                - error (str): Error message (if failed)
        """
        # Create specialized prompt for extracting action items
        prompt = f"""Extract action items from this meeting transcription. Look for tasks, to-dos, assignments, or things people agreed to do.

    Meeting Transcription:
    {transcription_text}

        Return a JSON array where each action item has:
        - task: what needs to be done
        - priority: high, medium, or low (based on urgency or importance)
        - assigned_to: person's name if mentioned, otherwise "Unassigned"

        Return ONLY valid JSON. Example:
            [
            {{"task": "Complete user testing by Friday", "priority": "high", "assigned_to": "Sarah Chen"}},
            {{"task": "Update documentation", "priority": "medium", "assigned_to": "Unassigned"}}
            ]

        If no action items exist, return: []"""

        try:
            # Send POST request to LOCAL Ollama's chat API (v0.12+)
            response = requests.post(
                f"{self.ollama_host}/api/chat",
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "stream": False
                },
                timeout=300  # 5 minute timeout
            )

            response.raise_for_status()
            result = response.json()

            # Extract message content from chat response
            message = result.get("message", {})
            ai_response = message.get("content", "").strip()

            # Parse AI response as JSON
            # Clean up the response - remove markdown code blocks
            cleaned_response = ai_response.strip()

            # Remove markdown code blocks
            if "```json" in cleaned_response:
                start = cleaned_response.find("```json") + 7
                end = cleaned_response.find("```", start)
                if end != -1:
                    cleaned_response = cleaned_response[start:end].strip()
            elif "```" in cleaned_response:
                start = cleaned_response.find("```") + 3
                end = cleaned_response.find("```", start)
                if end != -1:
                    cleaned_response = cleaned_response[start:end].strip()

            # Find JSON array in response (look for [ and ])
            if not cleaned_response.startswith("["):
                start_idx = cleaned_response.find("[")
                if start_idx != -1:
                    end_idx = cleaned_response.rfind("]")
                    if end_idx != -1:
                        cleaned_response = cleaned_response[start_idx:end_idx+1]

            # Parse JSON array of action items
            action_items = json.loads(cleaned_response)

            # Validate that we got a list
            if not isinstance(action_items, list):
                action_items = []

            # Ensure all action items have required fields
            normalized_items = []
            for item in action_items:
                if isinstance(item, dict):
                    normalized_items.append({
                        "task": item.get("task", ""),
                        "priority": item.get("priority", "medium"),
                        "assigned_to": item.get("assigned_to", "Unassigned")
                    })

            return {
                "success": True,
                "action_items": normalized_items,
                "model_used": self.model
            }

        except json.JSONDecodeError:
            # If can't parse JSON, return empty action items
            return {
                "success": True,
                "action_items": [],
                "model_used": self.model,
                "warning": "Could not parse action items from AI response"
            }

        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "error": "Could not connect to Ollama. Make sure Ollama is running on your machine."
            }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Action item extraction timed out. Please try again."
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Action item extraction failed: {str(e)}"
            }

    def check_ollama_status(self) -> Dict[str, Any]:
        """
        Check if LOCAL Ollama is running and accessible.

        Returns:
            Dict[str, Any]: A dictionary containing:
                - status (str): "connected" or "disconnected"
                - host (str): The Ollama host URL
                - available_models (list): List of model names (if connected)
                - message (str): Error message (if disconnected)
        """
        try:
            # Try to get list of available models from Ollama
            response = requests.get(f"{self.ollama_host}/api/tags", timeout=5)
            response.raise_for_status()

            # Parse response to get models
            models = response.json().get("models", [])

            return {
                "status": "connected",
                "host": self.ollama_host,
                "available_models": [m.get("name") for m in models]
            }

        except:
            # If anything goes wrong, Ollama is not accessible
            return {
                "status": "disconnected",
                "host": self.ollama_host,
                "message": "Ollama is not running or not accessible"
            }
