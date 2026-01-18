from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def get_prediction():
    return jsonify({"prediction": 112.5, "status": "success"})

if __name__ == "__main__":
    app.run(port=5000)
