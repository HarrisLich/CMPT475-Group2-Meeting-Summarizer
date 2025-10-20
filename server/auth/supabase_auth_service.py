import os 
from supabase import create_client

class SupabaseAuthService():
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.client = create_client(self.url,self.key)
    def sign_up(self,email,password):
        return self.client.auth.sign_up({
            "email":email,
            "password":password
        })

    def sign_in(self,email,password):
        return self.client.auth.sign_in_with_password({
            "email":email,
            "password":password
        })


    def sign_out(self,session_id):
        return self.client.auth.sign_out()

    def get_user(self,token):
        return self.client.auth.get_user(token)

#Singleton Instance
_instance = None

def get_supabase_auth():
    global _instance
    if _instance is None:
        _instance = SupabaseAuthService()
    return _instance