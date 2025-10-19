from fastapi import Request, Depends
from auth.dependencies import get_current_user
from .supabase_service import get_supabase
   
async def get_db_with_auth(current_user = Depends(get_current_user)):
    supabase = get_supabase()
    return supabase.set_auth_override(current_user["uid"])