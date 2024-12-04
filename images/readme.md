<h1 align="center">Hachi</h1>

<h3 align="center">
    An end to end semantic and meta-data search engine for personal data.
</h1>

## Screenshots:
![query](/images/assets/screenshot_query.png "query screenshot")

![image_card](/images/assets/screenshot_image_card.png "image card screenshot")

### More screenshots:
	
<details>
	<summary>Indexing</summary>
    <img src = "/images/assets/screenshot_indexing.png" alt="screenshot indexing">
</details>

## Features:
- **Semantic + Meta-data Search**: Query data using Natural language and/or Meta-data attributes. Combine any attributes to enable complex queries.
- **End-2-end interface**: Index any media just by providing a path to a local directory/folder and start querying. No complex configurations. 
- **Face-recognition**: Face Detection and Recognition.
- **Fast**: Start Getting Results in milliseconds. All Indices are stored on user's system.
- **Minimal Requirements**: Any consumer Grade CPU with AVX2 instructions enabled and minimal software dependencies. (No dependence on deep-learning frameworks like ``pytorch``/``tensorflow``/``onnx`` .)
- **Private**: Fully self hosted on users' system with **no** dependence on outside Network in any manner.

## Hardware requirements:
    Intel-64/AMD CPU with AVX2 instructions enabled.

## Software requirements:
-   **Python3 with pip installed** (tested with >= 3.8.x)

-   **Caddy**:  Open Source Web server. Download from [here](https://caddyserver.com/docs/install)

## Supported OS:
* Windows (Tested on 10/11).
* Linux   (GlibC >= 2.27)         [ Run command ``ldd --version`` to check glibc version.]  (minimal testing, may have minor issues due to cross compilation. Open issue if encounter a bug!)


## Install (one-time process):

1. Install [Caddy](https://caddyserver.com/docs/install) (Open source webserver, For serving static files and out of the box HTTPS configuration, if needed.)
2. Python 3 (Tested with versions >= 3.8)
3. Download latest code for [main branch](https://github.com/eagledot/hachi/archive/refs/heads/main.zip) or ``git clone https://github.com/eagledot/hachi.git``
4. ``cd`` into the cloned/downloaded repository.       ( i.e change path to the root of cloned repository)
5. ``cd`` into the `images` directory .
6. Collect Model Weights by downloading ``dataV2.zip`` from  [releases](https://github.com/eagledot/hachi/releases/download/v1.3/dataV2.zip), ``extract/collect`` 2 `.bin` files from it into the path ``./data``(i.e. data folder in curretn directory) , such that now ``./data`` directory has 3 ``.bin`` files in it.
7. Run command ``pip install -r requirements.txt``   ( This would install ``opencv-python``, ``numpy``, ``flask``, ``regex``, ``ftfy``, ``plum-py`` python packages, if not found .)

    ### Extra steps (for Linux distributions Only.)

    8. Run command ``conda install -c conda-forge onednn-cpu-omp=2.6.0`` ( conda is the most sane way i could find to install onednn shared library, without getting frustrated due to GlibC mismatching.)

        * update the ``LD_LIBRARY_PATH`` to make ``dynamic linker`` search for ``shared objects`` in the Conda path (if     not already done!)

    9. Install ``openblas`` if not already included/installed with your OS.
        *   ``sudo dnf install openblas-devel`` (Fedora)
        *   ``sudo apt-get install openblas-dev``  (Ubuntu/Debian)

## Usage:
1. make sure current working directory is `<root>/images` .
2.  Run command: ``caddy run``                  # this will start caddy as frontend proxy
3. Run command: ``python semantic_search.py``  OR ``python3 semantic_search.py``  (wait for flask/server to be started)
4. Visit [http://localhost:5000](http://localhost:5000)

## Development:

### Front-End:
Front-end code of the app lies in ``./static/`` directory and is generated automatically based on the [svelte](https://svelte.dev/) components in ``./hachi_frontend`` directory.
Front-end development requires ``Node``(tested with v18.13.0) to be installed on user's machine.

Checkout ``readme.md`` in ``./hachi_frontend`` for more details. 


## References/Resources:
* Machine learning model powering this webapp is based on [CLIP](https://github.com/openai/CLIP) architecture.
* https://gitlab.com/TNThieding/exif/ (exif data extraction)
* https://github.com/scardine/image_size (extract image meta-data with no dependencies.)
* https://www.geonames.org/   (geographical database allowing to implement a dependency free reverse geocoder for this project.)

## Extra Details:
For Windows, shared libraries  ``dnnl.dll`` and ``dnnl_v3.dll`` are included in this repository and are based on the [ONEDNN Project](https://github.com/oneapi-src/oneDNN).
Specifically ``dnnl.dll`` corresponds to a version >= ``2.6.x`` but less than version ``3.x.x`` and ``dnnl_v3.dll`` corresponds to the version >= ``3.x.x`` but less than ``4.x.x``.
Developers can choose to build their own corresponding ``DLLs`` based on the instructions on the [project](https://github.com/oneapi-src/oneDNN#requirements-for-building-from-source) page, provided they name it as ``dnnl.dll`` and ``dnnl_v3.dll`` after building.

``Openblas.dll`` included along is based on the project https://github.com/OpenMathLib/OpenBLAS/ and as an alternative can be built from scratch or can be downloaded directly from [releases](https://github.com/OpenMathLib/OpenBLAS/releases) . 

<details>
   <summary><h3>RAM usage</h3></summary>
  
  Server hovers at 1100 Mb of RAM usage, which also includes around 650 Mb usage by CLIP Machine-learning model.
  In future, idea is to use ``image-encoder`` only during indexing, which should save us about 350 Mb RAM usage.

</details>

<details>
    <summary><h3>Machine Learning</h3></summary>

  Machine learning portion currently is comprised of <b>CLIP</b>, and a Face-recognition pipeline, based on the following code repositories.

  * https://github.com/biubug6/Pytorch_Retinface (for face detection and landmarks prediction).

  * https://github.com/TreB1eN/insightFace_Pytorch (for face recognition)
  
  * https://github.com/openai/clip                 (CLIP image and text encoders)

  Compiled models shipped along are modified (and fine-tuned) versions, built upon the work mentioned above and are written completely in Nim for production deployment.
  `__init__` files in `ML` directory should be modified in case a user wants to use a custom/new model in-place of default models, or open an issue in case needs help !

</details>
  

## FAQs:

<details>
	<summary>What is Hachi ?</summary>

Hachi is an end to end semantic and meta-data search engine for personal data.	

**end to end**: It takes care of embeddings generation, meta-data extraction, storage, and retrieval without any intervention for data in a directory pointed to by user. It doesn't modify original data in any form.   	

**Semantic**:   Understands natural language query.

**meta-data**:  Extracts possible meta-data like `filename`, `directory`, available `exif-data` for a resource like an image. 

**Search**:    Provides an unified interface to allow search using semantic and/or meta-data attributes, hence allowing complex queries.


</details>
