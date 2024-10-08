from flask import Flask, render_template

app = Flask(__name__, template_folder='static/../')
app.config['TEMPLATES_AUTO_RELOAD'] = True

@app.route("/")
def index():
    return render_template('index.html')
