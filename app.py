from flask import Flask, render_template
import os


template_dir = os.path.abspath('../../')
print(template_dir)
app = Flask(__name__, template_folder='/')
app.config['TEMPLATES_AUTO_RELOAD'] = True

@app.route("/")
def index():
    return render_template('index.html')
