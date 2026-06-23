import re
import json
import os

# This JSON file will act as our lightweight database
DB_FILE = "inventory_db.json"

def parse_channel_post(message_text: str, message_id: int, image_file_id: str) -> dict:
    """
    Extracts item ID and price from the channel post caption.
    Expected format in text: "Beautiful dress! #id_001 #price_4500"
    """
    if not message_text:
        return None

    # Regex to find #id_XYZ and #price_123
    id_match = re.search(r'#id_(\w+)', message_text, re.IGNORECASE)
    price_match = re.search(r'#price_(\d+)', message_text, re.IGNORECASE)
    
    if id_match and price_match:
        item_id = id_match.group(1)
        price = int(price_match.group(1))
        
        item_data = {
            "message_id": message_id,
            "item_id": item_id,
            "price": price,
            "image_file_id": image_file_id, # Telegram's internal ID for the photo
            "description": message_text.replace(id_match.group(0), "").replace(price_match.group(0), "").strip()
        }
        return item_data
    return None

def save_to_inventory(item_data: dict):
    """Saves the parsed item to a local JSON file."""
    inventory = {}
    
    # Load existing inventory if the file exists
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r", encoding="utf-8") as f:
            try:
                inventory = json.load(f)
            except json.JSONDecodeError:
                inventory = {} # In case the file is empty or corrupted
            
    # Save or update the item using its ID as the key
    inventory[item_data["item_id"]] = item_data
    
    # Write back to the file
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(inventory, f, indent=4, ensure_ascii=False)
        
    print(f"✅ Successfully saved Item #{item_data['item_id']} to the database!")
    print(f"   Price: {item_data['price']} ETB")

