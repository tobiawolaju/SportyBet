from flask import Blueprint, jsonify

main = Blueprint('main', __name__)

@main.route('/status')
def status():
    return jsonify({"status": "online"})
