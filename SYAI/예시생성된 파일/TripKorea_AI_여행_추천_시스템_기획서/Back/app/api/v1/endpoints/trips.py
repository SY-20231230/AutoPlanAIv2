```python
        def calculate_average(self, numbers):
            """Calculates the average of a list of numbers."""
            if not numbers:
                return 0
            return sum(numbers) / len(numbers)

    def main():
        """Main execution function."""
        print("Starting the application...")
        util = Utility()
        
        # Example usage of the helper functions
        data_string = "   Hello World   "
        cleaned_string = util.clean_string(data_string)
        print(f"Original: '{data_string}', Cleaned: '{cleaned_string}'")
        
        data_list = [10, 20, 30, 40, 50]
        average = util.calculate_average(data_list)
        print(f"The average of {data_list} is {average}")

        print("Application finished.")

    if __name__ == "__main__":
        main()

except ImportError as e:
    print(f"Error: A required module is missing. {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")

```