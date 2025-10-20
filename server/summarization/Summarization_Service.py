"""
Summarization Service Module

This module provides AI-powered summarization of meeting transcriptions using Ollama.

"""

import os
from typing import Dict, Any
import requests
from dotenv import load_dotenv

# load environment variables from .env file
# this allows us to configure Ollama host and model without changing code
load_dotenv()

class SummarizationService:
    """
    Attributes:
        ollama_host (str): The URL where Ollama is running (default: http://localhost:11434)
        model (str): The Ollama model to use for summarization (default: llama3.2)
    """

    # default prompt template
    # this makes it easy to see, modify, and override
    # the {transcription_text} placeholder will be replaced with the actual transcription
    DEFAULT_PROMPT_TEMPLATE = """You are a meeting summarization assistant. Please analyze the following meeting transcription and provide:

1. A brief summary (3-4 sentences)
2. Key points discussed (bullet points)
3. Action items (if any)
4. Main topics covered

Meeting Transcription:
{transcription_text}

Please format your response clearly with sections for each part."""

    def __init__(self):
        """
        Initialize the SummarizationService.

        Reads configuration from environment variables:
        - OLLAMA_HOST: Where Ollama is running (e.g., http://localhost:11434)
        - OLLAMA_MODEL: Which AI model to use (e.g., llama3.2, mistral)
        """
        # Get Ollama host from environment variable, default to localhost if not set
        self.ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")

        # Get the model name from environment variable, default to llama3.2
        self.model = os.getenv("OLLAMA_MODEL", "llama3.2")

        # Always use the default prompt template
        self.prompt_template = self.DEFAULT_PROMPT_TEMPLATE

    def summarize_transcription(self, transcription_text: str) -> Dict[str, Any]:
        """
        Summarize a meeting transcription using Ollama's AI models.

        This method uses the prompt to create a structured summary of the provided transcription text.

        Args:
            transcription_text (str): The full text transcription of the meeting

        Returns:
            Dict[str, Any]: A dictionary containing:
                - success (bool): Whether the summarization was successful
                - summary (str): The AI-generated summary (if successful)
                - model_used (str): Which model was used
                - transcription_length (int): Length of the input text
                - error (str): Error message (if failed)

        Example:
            >>> service = SummarizationService()
            >>> result = service.summarize_transcription("Meeting about project updates...")
            >>> print(result['summary'])
        """

        # Format the default prompt with the transcription text
        prompt = self.prompt_template.format(transcription_text=transcription_text)

        try:
            # Send a POST request to Ollama's generate API endpoint
            # This endpoint takes a model name and prompt, and returns AI-generated text
            response = requests.post(
                f"{self.ollama_host}/api/generate",  # Ollama's API endpoint
                json={
                    "model": self.model,              # Which AI model to use
                    "prompt": prompt,                 # The prompt we created above
                    "stream": False                   # Get the full response at once (not streaming)
                },
                timeout=300  # Wait up to 5 minutes (AI can take time for long texts)
            )

            # Raise an exception if the HTTP request failed (non-200 status code)
            response.raise_for_status()

            # Parse the JSON response from Ollama
            result = response.json()

            # Return a success response with the AI-generated summary
            return {
                "success": True,
                "summary": result.get("response", ""),           # The AI's summary
                "model_used": self.model,                        # Which model we used
                "transcription_length": len(transcription_text)  # Original text length
            }

        except requests.exceptions.ConnectionError:
            # This error occurs when Ollama isn't running or isn't accessible
            return {
                "success": False,
                "error": "Could not connect to Ollama. Make sure Ollama is running on your machine.",
                "hint": "Run 'ollama serve' in a terminal"
            }

        except requests.exceptions.Timeout:
            # This error occurs when the AI takes too long to respond
            return {
                "success": False,
                "error": "Summarization timed out. The transcription might be too long."
            }

        except Exception as e:
            # Catch any other unexpected errors
            return {
                "success": False,
                "error": f"Summarization failed: {str(e)}"
            }

    def chat_about_meeting(self, meeting_context: str, user_question: str) -> Dict[str, Any]:
        """
        Have a conversational interaction about a meeting using Ollama.

        This method allows for natural conversation about meeting content,
        answering questions, providing greetings, and discussing specific topics.

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

        # Create a conversational prompt that makes Ollama act as a meeting assistant
        prompt = f"""You are a friendly and helpful meeting assistant AI named SumurAI. You help users understand and interact with their meeting content.

You have access to the full meeting transcription with timestamps. When users ask about specific times or moments, reference the timestamps to provide accurate information. When users ask about what was said about a topic or person, search through the transcription for relevant mentions.

Meeting Context:
{meeting_context}

User: {user_question}

SumurAI Assistant: """

        try:
            # Send a POST request to Ollama's generate API endpoint
            response = requests.post(
                f"{self.ollama_host}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=120
            )

            # Raise an exception if the HTTP request failed
            response.raise_for_status()

            # Parse the JSON response from Ollama
            result = response.json()

            # Return a success response with the AI's conversational response
            return {
                "success": True,
                "response": result.get("response", ""),
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
        Extract detailed action items from a meeting transcription using Ollama.

        This method takes a transcription and uses AI to identify and structure action items
        with details like priority, assigned person, and task description.

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

        # Create a specialized prompt for extracting action items
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
            # Send a POST request to Ollama's generate API endpoint
            response = requests.post(
                f"{self.ollama_host}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=300  # 5 minute timeout for action item extraction
            )

            # Raise an exception if the HTTP request failed
            response.raise_for_status()

            # Parse the JSON response from Ollama
            result = response.json()
            ai_response = result.get("response", "").strip()

            # Try to parse the AI's response as JSON
            import json

            # Clean up the response - remove markdown code blocks and extra text
            cleaned_response = ai_response.strip()

            # Remove markdown code blocks
            if "```json" in cleaned_response:
                # Extract content between ```json and ```
                start = cleaned_response.find("```json") + 7
                end = cleaned_response.find("```", start)
                if end != -1:
                    cleaned_response = cleaned_response[start:end].strip()
            elif "```" in cleaned_response:
                # Extract content between ``` and ```
                start = cleaned_response.find("```") + 3
                end = cleaned_response.find("```", start)
                if end != -1:
                    cleaned_response = cleaned_response[start:end].strip()

            # Try to find JSON array in the response (look for [ and ])
            if not cleaned_response.startswith("["):
                start_idx = cleaned_response.find("[")
                if start_idx != -1:
                    end_idx = cleaned_response.rfind("]")
                    if end_idx != -1:
                        cleaned_response = cleaned_response[start_idx:end_idx+1]

            # Parse the JSON array of action items
            action_items = json.loads(cleaned_response)

            # Validate that we got a list
            if not isinstance(action_items, list):
                action_items = []

            # Ensure all action items have the required fields
            normalized_items = []
            for item in action_items:
                if isinstance(item, dict):
                    normalized_items.append({
                        "task": item.get("task", ""),
                        "priority": item.get("priority", "medium"),
                        "assigned_to": item.get("assigned_to", "Unassigned")
                    })

            # Return success response with extracted action items
            return {
                "success": True,
                "action_items": normalized_items,
                "model_used": self.model
            }

        except json.JSONDecodeError:
            # If we can't parse the JSON, return empty action items
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
        Check if Ollama is running and accessible.


        Returns:
            Dict[str, Any]: A dictionary containing:
                - status (str): "connected" or "disconnected"
                - host (str): The Ollama host URL
                - available_models (list): List of model names (if connected)
                - message (str): Error message (if disconnected)

        Example:
            >>> service = SummarizationService()
            >>> status = service.check_ollama_status()
            >>> if status['status'] == 'connected':
            >>>     print(f"Ollama is running with models: {status['available_models']}")
        """
        try:
            # Try to get the list of available models from Ollama
            # The /api/tags endpoint returns all models that are downloaded
            response = requests.get(f"{self.ollama_host}/api/tags", timeout=5)

            # Raise an exception if the request failed
            response.raise_for_status()

            # Parse the response to get the list of models
            models = response.json().get("models", [])

            # Return success status with available models
            return {
                "status": "connected",
                "host": self.ollama_host,
                "available_models": [m.get("name") for m in models]  # Extract model names
            }

        except:
            # If anything goes wrong, Ollama is not accessible
            return {
                "status": "disconnected",
                "host": self.ollama_host,
                "message": "Ollama is not running or not accessible"
            }
