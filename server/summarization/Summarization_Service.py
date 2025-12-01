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
   - ### Work Done / Tasks Accomplished / Free Choice (Make this section either a recollection of compeleted tasks from the meeting, or another relevant area is "work done" is not relevant.)
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
        # Use few-shot examples to teach the model the desired behavior
        # Small models learn better from examples than from abstract rules
        prompt = f"""You are SumurAI, an AI assistant. Answer any question directly - meeting-related or not.

        Examples of good responses:

        Meeting notes: [Discussion about Q4 goals...]
        User: What's 25 times 4?
        SumurAI: 25 times 4 is 100.

        Meeting notes: [Team standup about bugs...]
        User: Tell me about photosynthesis.
        SumurAI: Photosynthesis is the process plants use to convert sunlight into energy. They use chlorophyll to capture light and combine carbon dioxide and water to create glucose and oxygen.

        Meeting notes: [Product roadmap discussion...]
        User: What did we decide about the new feature?
        SumurAI: According to the meeting, the team agreed to prioritize the new feature for next sprint.

        Now it's your turn:

        Meeting notes:
        {meeting_context}

        User: {user_question}

        SumurAI:"""

        try:
            # Send POST request to LOCAL Ollama's chat API
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
        # Extract unique names from the transcript to provide to LLM
        import re
        # Find all names in format "Name: text" from the transcript
        name_pattern = r'^([^:]+):\s'
        found_names = set()
        for line in transcription_text.split('\n'):
            match = re.match(name_pattern, line.strip())
            if match:
                name = match.group(1).strip()
                if name and not name.startswith('SPEAKER_'):
                    found_names.add(name)
        
        names_list = sorted(list(found_names)) if found_names else []
        names_context = f"\n\nIMPORTANT: The following people are in this meeting: {', '.join(names_list)}. ONLY use these exact names when assigning tasks. Do NOT make up names or use names not in this list." if names_list else ""
        
        prompt = f"""Extract action items from this meeting transcription. Look for tasks, to-dos, steps, assignments, deadlines, and responsibilities.

    Transcription:
    {transcription_text}{names_context}

        Return a JSON array where each action item has:
        - task: what needs to be done
        - priority: high, medium, or low (based on urgency or importance)
        - assigned_to: CRITICAL - Every task MUST be assigned to someone. Follow these rules STRICTLY:
            * The transcription shows who is speaking in format "Name: text"
            * ONLY use names that appear in the transcription (the list provided above)
            * Look for explicit commitments: "I will...", "I'll handle that", "I can do that", "I'll take care of it", "Let me...", "I'll work on..."
            * Look for assignments: "John will...", "Sarah is going to...", "assigned to Alex", "Mike agreed to...", "Can you handle this, Sarah?"
            * If a speaker commits to doing something (says "I will", "I'll", "Let me"), assign it to THAT SPEAKER'S NAME (the name before the colon)
            * If someone is explicitly assigned a task by another speaker, use that person's name
            * If a task is discussed in context of a specific person's role/responsibility, assign it to them
            * If multiple people are involved, assign to the person who committed or is most directly responsible
            * ONLY use "Unassigned" if the task is truly vague with no clear owner AND no one committed to it
            * When someone says "I'll do it" or "I can handle that", that's a commitment - assign it to them
            * Pay close attention to who is speaking when tasks are mentioned - the speaker often commits to their own tasks
            * DO NOT invent names - only use names that appear in the transcription

        IMPORTANT: 
        - Minimize "Unassigned" - if a task exists, someone should be responsible
        - ONLY use names from the list provided above
        - If you see a name in the transcription, use that EXACT name (case-sensitive)

        Return ONLY valid JSON. Example:
            [
            {{"task": "Complete user testing by Friday", "priority": "high", "assigned_to": "Sarah Chen"}},
            {{"task": "Update documentation", "priority": "medium", "assigned_to": "John Doe"}},
            {{"task": "Review analytics dashboard", "priority": "high", "assigned_to": "Mike"}},
            {{"task": "Send follow-up email", "priority": "low", "assigned_to": "Alex"}}
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

            # ENSURE AT LEAST 1 ACTION ITEM: If no items were extracted, create a default one
            if len(normalized_items) == 0:
                print("[AI] No action items extracted - adding default fallback item")
                normalized_items.append({
                    "task": "Review meeting notes and follow up on discussion points",
                    "priority": "medium",
                    "assigned_to": "Unassigned"
                })

            return {
                "success": True,
                "action_items": normalized_items,
                "model_used": self.model
            }

        except json.JSONDecodeError:
            # If can't parse JSON, return default fallback action item
            print("[AI] Failed to parse JSON - adding default fallback item")
            return {
                "success": True,
                "action_items": [{
                    "task": "Review meeting notes and follow up on discussion points",
                    "priority": "medium",
                    "assigned_to": "Unassigned"
                }],
                "model_used": self.model,
                "warning": "Could not parse action items from AI response - using fallback"
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

    def generate_meeting_title(self, transcription_text: str) -> Dict[str, Any]:
        """Generate a concise, descriptive title for a meeting based on its transcription."""
        prompt = f"""Based on the meeting transcription below, generate a short, descriptive title that captures the main topic.

    Meeting Transcription:
    {transcription_text[:2000]}

    REQUIREMENTS:
    - Keep the title between 3-8 words
    - Make it specific and descriptive
    - Use title case
    - DO NOT use generic phrases like "Meeting Summary" or "Discussion"
    - Focus on the actual topic being discussed

    Return ONLY the title text, nothing else."""

        try:
            response = requests.post(
                f"{self.ollama_host}/api/chat",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False
                },
                timeout=30
            )
            response.raise_for_status()
            result = response.json()

            title = result.get("message", {}).get("content", "").strip().strip('"').strip("'").strip()

            if len(title) > 100:
                title = title[:100].rsplit(' ', 1)[0] + "..."

            return {"success": True, "title": title, "model_used": self.model}

        except requests.exceptions.ConnectionError:
            return {"success": False, "error": "Could not connect to Ollama"}
        except requests.exceptions.Timeout:
            return {"success": False, "error": "Title generation timed out"}
        except Exception as e:
            return {"success": False, "error": f"Title generation failed: {str(e)}"}

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
