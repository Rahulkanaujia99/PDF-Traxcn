import os
import json
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger("supabase_service")

# Check for Supabase credentials from environment
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY") or "").strip()

supabase_client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client, Client
        supabase_client: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("[Supabase] Connected successfully to Supabase.")
    except Exception as e:
        logger.warning(f"[Supabase] Failed to initialize Supabase client: {e}. Falling back to local mode.")
        supabase_client = None
else:
    logger.info("[Supabase] Running in local offline mode (no SUPABASE_URL configured).")


class SupabaseService:
    def __init__(self):
        self.client = supabase_client
        self.is_enabled = self.client is not None

    def upload_pdf_bytes(self, bucket: str, destination_path: str, content: bytes, content_type: str = "application/pdf") -> Optional[str]:
        """Uploads raw bytes to a Supabase storage bucket."""
        if not self.is_enabled:
            return None
        try:
            # Upsert into storage bucket
            self.client.storage.from_(bucket).upload(
                path=destination_path,
                file=content,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            # Retrieve public URL
            public_url = self.client.storage.from_(bucket).get_public_url(destination_path)
            return public_url
        except Exception as e:
            logger.error(f"[Supabase] Storage upload error ({bucket}/{destination_path}): {e}")
            return None

    def download_pdf_bytes(self, bucket: str, storage_path: str) -> Optional[bytes]:
        """Downloads file bytes from a Supabase storage bucket."""
        if not self.is_enabled:
            return None
        try:
            data = self.client.storage.from_(bucket).download(storage_path)
            return data
        except Exception as e:
            logger.error(f"[Supabase] Storage download error ({bucket}/{storage_path}): {e}")
            return None

    def upsert_file_record(self, record: Dict[str, Any]) -> bool:
        """Upserts a file tracking record into the 'tracxn_files' table."""
        if not self.is_enabled:
            return False
        try:
            payload = {
                "id": record["id"],
                "filename": record["filename"],
                "processed_filename": record.get("processed_filename"),
                "size": record.get("size", 0),
                "formatted_size": record.get("formatted_size", ""),
                "page_count": record.get("page_count", 0),
                "raw_storage_path": record.get("raw_storage_path"),
                "cleaned_storage_path": record.get("cleaned_storage_path"),
                "status": record.get("status", "READY"),
                "progress": record.get("progress", 0),
                "pages_scanned": record.get("pages_scanned", 0),
                "disclaimers_removed": record.get("disclaimers_removed", 0),
                "disclaimers_found": record.get("disclaimers_found", 0),
                "needs_review_count": record.get("needs_review_count", 0),
                "pages_with_disclaimer": record.get("pages_with_disclaimer", []),
                "validation": record.get("validation"),
                "page_details": record.get("page_details", []),
                "error_message": record.get("error_message")
            }
            self.client.table("tracxn_files").upsert(payload).execute()
            return True
        except Exception as e:
            logger.error(f"[Supabase] DB upsert error for file {record.get('id')}: {e}")
            return False

    def update_file_record(self, file_id: str, updates: Dict[str, Any]) -> bool:
        """Updates specific fields for an existing file record."""
        if not self.is_enabled:
            return False
        try:
            self.client.table("tracxn_files").update(updates).eq("id", file_id).execute()
            return True
        except Exception as e:
            logger.error(f"[Supabase] DB update error for file {file_id}: {e}")
            return False

    def get_file_record(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single file record by ID."""
        if not self.is_enabled:
            return None
        try:
            res = self.client.table("tracxn_files").select("*").eq("id", file_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
            return None
        except Exception as e:
            logger.error(f"[Supabase] DB fetch error for file {file_id}: {e}")
            return None

    def list_all_files(self) -> Optional[List[Dict[str, Any]]]:
        """Lists all file records ordered by creation date."""
        if not self.is_enabled:
            return None
        try:
            res = self.client.table("tracxn_files").select("*").order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            logger.error(f"[Supabase] DB list error: {e}")
            return None

    def delete_file_record(self, file_id: str, raw_path: Optional[str] = None, cleaned_path: Optional[str] = None) -> bool:
        """Deletes a file record and its storage objects."""
        if not self.is_enabled:
            return False
        try:
            if raw_path:
                try:
                    self.client.storage.from_("raw-pdfs").remove([raw_path])
                except Exception:
                    pass
            if cleaned_path:
                try:
                    self.client.storage.from_("cleaned-pdfs").remove([cleaned_path])
                except Exception:
                    pass
            self.client.table("tracxn_files").delete().eq("id", file_id).execute()
            return True
        except Exception as e:
            logger.error(f"[Supabase] DB delete error for file {file_id}: {e}")
            return False

    def clear_all(self) -> bool:
        """Wipes all rows in tracxn_files table."""
        if not self.is_enabled:
            return False
        try:
            # Delete all rows where id is not null
            self.client.table("tracxn_files").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            return True
        except Exception as e:
            logger.error(f"[Supabase] DB clear error: {e}")
            return False


supabase_service = SupabaseService()
