```python
class ConfigurationManager:
    """
    Handles loading and managing application configurations.
    """
    def __init__(self, config_file="config.json"):
        self.config_file = config_file
        self.config = {}
        self._load_config()

    def _load_config(self):
        """Loads configuration from the specified JSON file."""
        try:
            with open(self.config_file, 'r') as f:
                self.config = json.load(f)
            print(f"Configuration loaded from {self.config_file}")
        except FileNotFoundError:
            print(f"Configuration file '{self.config_file}' not found. Using default settings.")
            self.config = self._get_default_config()
        except json.JSONDecodeError:
            print(f"Error decoding JSON from '{self.config_file}'. Using default settings.")
            self.config = self._get_default_config()

    def _get_default_config(self):
        """Returns a dictionary of default configuration settings."""
        return {
            "database": {
                "host": "localhost",
                "port": 5432,
                "user": "admin",
                "password": "password",
                "dbname": "app_db"
            },
            "logging": {
                "level": "INFO",
                "file": "app.log"
            },
            "api_keys": {
                "service_a": "your_api_key_a",
                "service_b": "your_api_key_b"
            }
        }

    def get_setting(self, key, default=None):
        """
        Retrieves a configuration setting by its key.
        Supports nested keys using dot notation (e.g., "database.host").
        """
        parts = key.split('.')
        current = self.config
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return default
        return current

    def set_setting(self, key, value):
        """
        Sets a configuration setting.
        Supports nested keys using dot notation.
        Note: This only updates the in-memory config, not the file.
        """
        parts = key.split('.')
        current = self.config
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                current[part] = value
            else:
                if part not in current or not isinstance(current[part], dict):
                    current[part] = {}
                current = current[part]
        print(f"Setting '{key}' updated to '{value}' in memory.")

    def save_config(self, output_file=None):
        """Saves the current in-memory configuration to a JSON file."""
        file_to_save = output_file if output_file else self.config_file
        try:
            with open(file_to_save, 'w') as f:
                json.dump(self.config, f, indent=4)
            print(f"Configuration saved to {file_to_save}")
        except IOError as e:
            print(f"Error saving configuration to {file_to_save}: {e}")

# Example usage (assuming this is part of a larger application)
if __name__ == "__main__":
    import json # Ensure json is imported if not already

    # Create a dummy config file for testing
    dummy_config_content = {
        "database": {
            "host": "production_db",
            "port": 5432
        },
        "logging": {
            "level": "DEBUG"
        }
    }
    with open("test_config.json", "w") as f:
        json.dump(dummy_config_content, f, indent=4)

    config_mgr = ConfigurationManager("test_config.json")

    db_host = config_mgr.get_setting("database.host")
    print(f"Database Host: {db_host}")

    log_level = config_mgr.get_setting("logging.level")
    print(f"Log Level: {log_level}")

    api_key_a = config_mgr.get_setting("api_keys.service_a", "default_api_key")
    print(f"API Key A: {api_key_a}") # This will use default as it's not in test_config.json

    config_mgr.set_setting("database.port", 5433)
    print(f"Updated DB Port (in-memory): {config_mgr.get_setting('database.port')}")

    config_mgr.set_setting("new_feature.enabled", True)
    print(f"New Feature Enabled: {config_mgr.get_setting('new_feature.enabled')}")

    # Save the modified config to a new file
    config_mgr.save_config("updated_test_config.json")

    # Clean up dummy files (optional)
    import os
    os.remove("test_config.json")
    os.remove("updated_test_config.json")
```