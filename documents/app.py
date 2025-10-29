# simple server wrapping necessary document indexing routines.
import uuid
import os
import json

# from hachi_documentes.indexing import Status, DocIndexing
from hachi_documentes.indexing import Status, DocIndexing
from typing import Iterable

import flask
from flask import Flask

from werkzeug.utils import secure_filename

# MUST match with the client side...
# query would be something like this  `filename=x.html|y.html&quezstion=what is your name`
attrsSep = "&"; # Separator for attributes in the URL query
keywordSep = "|"; # Separator for keywords within an attribute
attrKeywordSep = "="  # key/value separator..

db = None
app = Flask(__name__, static_url_path=None, static_folder=None, template_folder=None)

UPLOADS_DIRECTORY = os.path.join(os.path.dirname(__file__), "uploads")
if not os.path.exists(UPLOADS_DIRECTORY):
    os.mkdir(UPLOADS_DIRECTORY)

@app.route("/newClientId",methods = ["GET"])
def newClientId() -> Status:
    status =  Status(flag = True, info = None, data = {"client_id":uuid.uuid4().hex})
    return flask.jsonify(status)

@app.route("/upload", methods = ["POST"])
def upload() -> Status:
    # save the uploaded files, and return the URIs to server to allow server to request indexing for files just uploaded.

    client_id  = flask.request.form.get("client_id")
    resource_paths = []
    print(flask.request.files)
    for filename, desc in flask.request.files.items():
        print("filename: {}".format(filename))
        content = desc.read()
        resource_path = os.path.join(UPLOADS_DIRECTORY, "{}_{}".format(client_id, secure_filename(filename)))
        with open(resource_path, "wb") as f:
            f.write(content)

        resource_paths.append(resource_path)
        del resource_path, content 
    return flask.jsonify(Status(flag = True, info = None, data={"uris":resource_paths}))

@app.route("/indexSingle", methods = ["POST"])
def indexSingle() -> Status:
    client_id = flask.request.form.get("client_id")
    uri = flask.request.form.get("uri")
    status = db.single_file_indexing(resource_path = uri, client_id=client_id)    
    return flask.jsonify(status)

@app.route("/getIndexStatus/<client_id>", methods = ["GET"])
def getIndexingStatus(client_id) -> Status:
    status = db.get_status(client_id)
    return flask.jsonify(status)

@app.route("/beginIndex", methods = ["POST"])
def beginIndex() -> Status:
    client_id = flask.request.form["client_id"]
    uri = flask.request.form["uri"]
    status = db.begin(uri  = uri, client_id = client_id)
    return flask.jsonify(status)

@app.route("/cancelIndex/<client_id>", methods = ["GET"])
def cancelIndex(client_id) -> Status:
    status = db.stop(client_id = client_id)
    return flask.jsonify(status)

@app.route("/query", methods = ["POST"])
def query() -> Status:
    # 
    query = flask.request.form["query"]
    client_id = flask.request.form["client_id"]

    query_dict = {}
    attribute_values = [x.strip().lower() for x in query.split(attrsSep)]
    for attr_value in attribute_values:
        attribute = attr_value.split(attrKeywordSep)[0].strip().lower()
        values  = attr_value.split(attrKeywordSep)[1]
        if len(attribute) > 0:
            for value in values.split(keywordSep):
                if len(value) > 0:
                    query_dict[attribute] = value.strip().lower()
    
    print("dict: {}".format(query_dict))

    query_finished, results = db.query(client_id = client_id, query = query_dict, rerank = True)    
    assert isinstance(query_finished, bool)
    
    if query_finished == False:
        for i in range(len(results)):
            results[i]["score"] = "{0:.3f}".format(results[i]["score"])


    status =  Status(flag = True, info = None, data = {"query_finished":query_finished, "results":results})
    return flask.jsonify(status)

@app.route("/getFullContent/<filename>", methods = ["GET"])
def getFullHtml(filename):
    full_path = flask.request.args["uri"]
    extension = os.path.splitext(filename)[1][1:]
    content_type = "text"
    if extension == "pdf":
        content_type = "application"
    with open(full_path , "rb") as f:
        raw_data = f.read()
        return flask.Response(raw_data, mimetype = "{}/{}".format(content_type, extension))

@app.route("/suggest", methods = ["POST"])
def suggest() -> Status:
    """ Supposed to return suggestion as user type"""
    meta_attribute = flask.request.form.get("attribute")
    meta_query = flask.request.form.get("query")
    status = db.suggest(meta_attribute = meta_attribute, query = meta_query)
    return flask.jsonify(status) # basically a ordered list on the client side..

if __name__ == "__main__":
    db = DocIndexing()
    app.run(host = "127.0.0.1", port = 8200)
