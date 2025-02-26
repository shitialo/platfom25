import os
import time
from datetime import datetime, timedelta

def cleanup_thumbnails(max_age_days=7):
    """Remove thumbnails older than max_age_days"""
    thumb_dir = os.path.join('uploads', 'thumbnails')
    if not os.path.exists(thumb_dir):
        return
        
    cutoff = time.time() - (max_age_days * 24 * 60 * 60)
    
    for filename in os.listdir(thumb_dir):
        filepath = os.path.join(thumb_dir, filename)
        if os.path.getmtime(filepath) < cutoff:
            try:
                os.remove(filepath)
                print(f"Removed old thumbnail: {filename}")
            except Exception as e:
                print(f"Error removing {filename}: {str(e)}")

# Add to app.py
from utils.image_cleanup import cleanup_thumbnails

@app.before_first_request
def setup():
    cleanup_thumbnails() 