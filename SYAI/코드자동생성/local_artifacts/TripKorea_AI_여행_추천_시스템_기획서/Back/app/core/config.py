```python
    def process_data(data_list):
        """
        Processes a list of numbers, calculating the sum, average, and maximum.
        
        :param data_list: A list of numbers (integers or floats).
        :return: A dictionary containing the sum, average, and maximum value.
                 Returns None if the list is empty or invalid.
        """
        if not data_list or not all(isinstance(x, (int, float)) for x in data_list):
            return None

        total = sum(data_list)
        count = len(data_list)
        average = total / count
        maximum = max(data_list)

        return {
            "sum": total,
            "average": average,
            "max": maximum
        }

def display_results(results, data_name="Dataset"):
    """
    Displays the processed data results in a formatted way.
    
    :param results: A dictionary with 'sum', 'average', and 'max' keys.
    :param data_name: An optional name for the dataset being displayed.
    """
    if results is None:
        print(f"Could not process {data_name}. Please check the input data.")
        return
    
    print(f"--- Analysis Results for {data_name} ---")
    print(f"Sum: {results['sum']}")
    print(f"Average: {results['average']:.2f}")
    print(f"Maximum Value: {results['max']}")
    print("--------------------------------------\n")

# --- Main execution block ---
if __name__ == "__main__":
    # Sample data
    sample_scores = [88, 92, 100, 75, 83, 95, 67]
    sample_measurements = [1.5, 2.3, 1.9, 3.1, 2.5, 2.8]
    empty_data = []
    invalid_data = [10, 20, "thirty", 40]

    # Process and display results for each dataset
    score_results = process_data(sample_scores)
    display_results(score_results, "Student Scores")

    measurement_results = process_data(sample_measurements)
    display_results(measurement_results, "Sensor Measurements")
    
    empty_results = process_data(empty_data)
    display_results(empty_results, "Empty Data")

    invalid_results = process_data(invalid_data)
    display_results(invalid_results, "Invalid Data")

```