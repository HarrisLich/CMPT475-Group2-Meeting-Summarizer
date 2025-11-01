"""
Test script for chat history database functionality.
This script tests the new conversation, message, and summary database methods.
"""

from database.supabase_service import get_supabase
from dotenv import load_dotenv
import os
import uuid

load_dotenv()

def test_chat_history():
    """Test all chat history related database methods"""
    print("🧪 Testing Chat History Database Implementation\n")

    supabase = get_supabase()

    # Test data - use valid UUIDs
    test_user_id = str(uuid.uuid4())

    print("=" * 60)
    print("TEST 1: Create a test meeting first")
    print("=" * 60)
    try:
        meeting_result = supabase.save_meeting(
            user_id=test_user_id,
            title="Test Meeting for Chat History"
        )
        print("✅ Meeting created successfully!")
        test_meeting_id = meeting_result.data[0]['id']
        print(f"Meeting ID: {test_meeting_id}")
    except Exception as e:
        print(f"❌ Failed to create meeting: {str(e)}")
        return

    print("\n" + "=" * 60)
    print("TEST 2: Create a new conversation")
    print("=" * 60)
    try:
        conversation_result = supabase.create_conversation(
            user_id=test_user_id,
            meeting_id=test_meeting_id,
            title="Test Meeting Summary Chat",
            model_version="llama3.2:3b"
        )
        print("✅ Conversation created successfully!")
        print(f"Conversation ID: {conversation_result.data[0]['id']}")
        conversation_id = conversation_result.data[0]['id']
    except Exception as e:
        print(f"❌ Failed to create conversation: {str(e)}")
        return

    print("\n" + "=" * 60)
    print("TEST 3: Save messages to the conversation")
    print("=" * 60)
    try:
        # Save user message
        user_message = supabase.save_message(
            conversation_id=conversation_id,
            role="user",
            content="What were the main action items from this meeting?"
        )
        print("✅ User message saved!")

        # Save assistant message
        assistant_message = supabase.save_message(
            conversation_id=conversation_id,
            role="assistant",
            content="The main action items were: 1) Complete the database schema implementation, 2) Test the new endpoints, 3) Document the API changes.",
            token_count=42
        )
        print("✅ Assistant message saved!")
    except Exception as e:
        print(f"❌ Failed to save messages: {str(e)}")

    print("\n" + "=" * 60)
    print("TEST 4: Retrieve conversation messages")
    print("=" * 60)
    try:
        messages_result = supabase.get_conversation_messages(conversation_id)
        print(f"✅ Retrieved {len(messages_result.data)} messages")
        for msg in messages_result.data:
            print(f"  - {msg['role']}: {msg['content'][:50]}...")
    except Exception as e:
        print(f"❌ Failed to retrieve messages: {str(e)}")

    print("\n" + "=" * 60)
    print("TEST 5: Get user conversations")
    print("=" * 60)
    try:
        user_conversations = supabase.get_user_conversations(test_user_id)
        print(f"✅ Retrieved {len(user_conversations.data)} conversations for user")
        for conv in user_conversations.data:
            print(f"  - {conv['title']} (ID: {conv['id']})")
    except Exception as e:
        print(f"❌ Failed to retrieve user conversations: {str(e)}")

    print("\n" + "=" * 60)
    print("TEST 6: Update conversation title")
    print("=" * 60)
    try:
        update_result = supabase.update_conversation_title(
            conversation_id=conversation_id,
            title="Updated Meeting Summary Chat"
        )
        print("✅ Conversation title updated!")
        print(f"New title: {update_result.data[0]['title']}")
    except Exception as e:
        print(f"❌ Failed to update conversation title: {str(e)}")

    print("\n" + "=" * 60)
    print("TEST 7: Save meeting summary")
    print("=" * 60)
    try:
        summary_result = supabase.save_summary(
            meeting_id=test_meeting_id,
            summary_text="This was a productive meeting where we discussed implementing chat history for user accounts.",
            key_points=["Database schema implementation", "API endpoint creation", "Testing procedures"]
        )
        print("✅ Summary saved successfully!")
        print(f"Summary ID: {summary_result.data[0]['id']}")
    except Exception as e:
        print(f"❌ Failed to save summary: {str(e)}")

    print("\n" + "=" * 60)
    print("TEST 8: Retrieve meeting summary")
    print("=" * 60)
    try:
        summary_get = supabase.get_meeting_summary(test_meeting_id)
        if summary_get.data:
            print("✅ Summary retrieved successfully!")
            print(f"Summary text: {summary_get.data[0]['summary_text'][:100]}...")
        else:
            print("⚠️  No summary found for this meeting")
    except Exception as e:
        print(f"❌ Failed to retrieve summary: {str(e)}")

    print("\n" + "=" * 60)
    print("TEST 9: Archive conversation")
    print("=" * 60)
    try:
        archive_result = supabase.archive_conversation(conversation_id, archived=True)
        print("✅ Conversation archived successfully!")
        print(f"Archived: {archive_result.data[0]['archived']}")
    except Exception as e:
        print(f"❌ Failed to archive conversation: {str(e)}")

    print("\n" + "=" * 60)
    print("🎉 ALL TESTS COMPLETED!")
    print("=" * 60)
    print("\n📝 NOTE: These tests create data in your Supabase database.")
    print("You may want to clean up test data manually in the Supabase dashboard.")

if __name__ == "__main__":
    test_chat_history()
