import re

def fix_log_activity():
    """
    Fix log_activity function in app.py to prevent unwanted history entries
    """
    # Read the file
    with open('app.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Define the new log_activity function
    new_function = '''def log_activity(user_id, activity_type, details=""):
    """Log user activity in the database - DEPRECATED
    This function is no longer used to prevent creating unwanted history entries.
    History entries should only be created by explicit user actions through the tracking endpoints.
    """
    # This function is intentionally disabled to prevent unwanted history entries
    # History should only be recorded through explicit tracking endpoints:
    # - /api/track_click (for Read More clicks)
    # - /api/track_read_aloud (for Read Aloud actions)
    print(f"Deprecated log_activity called but ignored: {activity_type}")
    return'''
    
    # Find the original function using regex
    original_function_pattern = r'def log_activity\(user_id, activity_type, details=""\):(?:.*?)\n\n'
    
    # Replace the original function (the first occurrence)
    modified_content = re.sub(original_function_pattern, new_function + '\n\n', content, count=1, flags=re.DOTALL)
    
    # Find and remove any duplicate log_activity function at the end of the file
    duplicate_pattern = r'def log_activity\(user_id, activity_type, details=""\):(?:.*?)return\n\nif __name__ == \'__main__\':'
    modified_content = re.sub(duplicate_pattern, 'if __name__ == \'__main__\'', modified_content, flags=re.DOTALL)
    
    # Write the changes back to the file
    with open('app.py', 'w', encoding='utf-8') as f:
        f.write(modified_content)
    
    print("Successfully fixed log_activity function in app.py")

if __name__ == "__main__":
    fix_log_activity() 