import shutil
import datetime
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def backup_database():
    db_file = "orders.db"
    backup_dir = "backups"
    
    if not os.path.exists(db_file):
        logger.error(f"Database file {db_file} not found. Cannot perform backup.")
        return False

    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
        logger.info(f"Created backup directory: {backup_dir}")

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_file = os.path.join(backup_dir, f"orders_backup_{timestamp}.db")

    try:
        shutil.copy2(db_file, backup_file)
        logger.info(f"Successfully backed up {db_file} to {backup_file}")
        
        # Keep only the last 10 backups
        backups = sorted([os.path.join(backup_dir, f) for f in os.listdir(backup_dir) if f.startswith("orders_backup_")])
        if len(backups) > 10:
            for b in backups[:-10]:
                os.remove(b)
                logger.info(f"Removed old backup: {b}")
                
        return True
    except Exception as e:
        logger.error(f"Backup failed: {e}")
        return False

if __name__ == "__main__":
    backup_database()
