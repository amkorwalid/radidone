import json
from fetch_analysis import analyze

result = analyze('./panoramic_test.jpg')

with open('analysis_result.json', 'w') as f:
    json.dump(result, f, indent=4)
    print("Analysis result saved to analysis_result.json")
