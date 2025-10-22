"""
Summarization Service Module

This module provides AI-powered summarization of meeting transcriptions using Groq.

"""

import os
from typing import Dict, Any
from groq import Groq
from dotenv import load_dotenv

# load environment variables from .env file
load_dotenv()

class SummarizationService:
    """
    Attributes:
        groq_client (Groq): The Groq API client
        model (str): The Groq model to use for summarization (default: llama-3.3-70b-versatile)
    """

    # default prompt template
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
        - GROQ_API_KEY: Your Groq API key (required)
        - GROQ_MODEL: Which AI model to use (default: llama-3.3-70b-versatile)
        """
        # Get Groq API key from environment variable
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is required")

        # Initialize Groq client
        self.groq_client = Groq(api_key=api_key)

        # Get the model name from environment variable, default to llama-3.3-70b-versatile
        # Available models: llama-3.3-70b-versatile, llama-3.1-70b-versatile, mixtral-8x7b-32768
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

        # Always use the default prompt template
        self.prompt_template = self.DEFAULT_PROMPT_TEMPLATE

    def summarize_transcription(self, transcription_text: str) -> Dict[str, Any]:
        """
        Summarize a meeting transcription using Groq's AI models.

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
            # Send a request to Groq's chat completion API
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model=self.model,
                temperature=0.5,  # Lower temperature for more focused summaries
                max_tokens=2048,  # Enough tokens for detailed summaries
            )

            # Extract the AI's response
            summary = chat_completion.choices[0].message.content

            # Return a success response with the AI-generated summary
            return {
                "success": True,
                "summary": summary,
                "model_used": self.model,
                "transcription_length": len(transcription_text)
            }

        except Exception as e:
            # Catch any errors
            return {
                "success": False,
                "error": f"Summarization failed: {str(e)}"
            }

    def chat_about_meeting(self, meeting_context: str, user_question: str) -> Dict[str, Any]:
        """
        Have a conversational interaction about a meeting using Groq.

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

        # Create a conversational prompt that makes the AI act as a meeting assistant
        system_message = """You are a friendly and helpful meeting assistant AI named SumurAI. You help users understand and interact with their meeting content.

You have access to the full meeting transcription with timestamps. When users ask about specific times or moments, reference the timestamps to provide accurate information. When users ask about what was said about a topic or person, search through the transcription for relevant mentions."""

        try:
            # Send a request to Groq's chat completion API
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": system_message,
                    },
                    {
                        "role": "user",
                        "content": f"Meeting Context:\n{meeting_context}\n\nUser Question: {user_question}",
                    }
                ],
                model=self.model,
                temperature=0.7,  # Higher temperature for more conversational responses
                max_tokens=1024,
            )

            # Extract the AI's response
            response = chat_completion.choices[0].message.content

            # Return a success response with the AI's conversational response
            return {
                "success": True,
                "response": response,
                "model_used": self.model
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Chat failed: {str(e)}"
            }

    def extract_action_items(self, transcription_text: str) -> Dict[str, Any]:
        """
        Extract detailed action items from a meeting transcription using Groq.

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
            # Send a request to Groq's chat completion API
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model=self.model,
                temperature=0.3,  # Lower temperature for more structured output
                max_tokens=2048,
            )

            # Extract the AI's response
            ai_response = chat_completion.choices[0].message.content.strip()

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

        except Exception as e:
            return {
                "success": False,
                "error": f"Action item extraction failed: {str(e)}"
            }

    def check_groq_status(self) -> Dict[str, Any]:
        """
        Check if Groq API is accessible.

        Returns:
            Dict[str, Any]: A dictionary containing:
                - status (str): "connected" or "disconnected"
                - model (str): The configured model name
                - message (str): Status message

        Example:
            >>> service = SummarizationService()
            >>> status = service.check_groq_status()
            >>> if status['status'] == 'connected':
            >>>     print(f"Groq is ready with model: {status['model']}")
        """
        try:
            # Try a simple API call to check connectivity
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": "Hello",
                    }
                ],
                model=self.model,
                max_tokens=10,
            )

            # Return success status
            return {
                "status": "connected",
                "model": self.model,
                "message": "Groq API is accessible"
            }

        except Exception as e:
            # If anything goes wrong, Groq is not accessible
            return {
                "status": "disconnected",
                "model": self.model,
                "message": f"Groq API is not accessible: {str(e)}"
            }
