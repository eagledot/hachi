<h1 align="center">Hachi</h1>

<h3 align="center">
    An end to end semantic and meta-data search engine for personal data.
</h1>

## ScreenShots:
![query](/assets/screenshot_query.png "query screenshot")
![image_card](/assets/screenshot_image_card.png "image card screenshot")

## More screenshots:
	<details>
		<summary>Indexing</summary>
	</details>

## Features:
- **Semantic + Meta-data Search**: Query data using Natural language and/or Meta-data attributes. Combine any attributes to enable complex queries.
- **End-2-end interface**: Index any media just by providing a path to a local directory/folder and start querying. No complex configurations. 
- **Face-recognition**: Face Detection and Recognition.
- **Fast**: Start Getting Results in milliseconds. All Indices are stored on user's system.
- **Minimal Requirements**: Any consumer Grade CPU with AVX2 instructions enabled and minimal software dependencies. (No dependence on deep-learning frameworks like ``pytorch``/``tensorflow``.)
- **Private**: Fully self hosted on users' system with **no** dependence on outside Network in any manner.

## Hardware requirements:
    Intel-64/AMD CPU with AVX2 instructions enabled.

## Software requirements:
-   **Python3 with pip installed** (tested with >= 3.6.x)

-   **Caddy**:  Open Source Web server. Download from [here](https://caddyserver.com/docs/install)

## Supported OS:
* Windows (Tested on 10/11).
* Linux   (GlibC >= 2.27)         [ Run command ``ldd --version`` to check glibc version.]

## Install (one-time process):

1. Install [Caddy](https://caddyserver.com/docs/install) (Open source webserver, For serving static files and out of the box HTTPS configuration, if needed.)
2. Python 3 (any version should work. Tested with versions >= 3.6.x)
3. Download ``source.zip``  from latest [release](https://github.com/eagledot/hachi/releases) or ``git clone https://github.com/eagledot/hachi.git``
4. ``cd`` into the cloned/downloaded repository.       ( i.e change path to the root of cloned repository)
5. Collect Model Weights by downloading ``data.zip`` from  [releases](https://github.com/eagledot/hachi/releases/download/v1.0/data.zip), ``extract/collect`` 2 `.bin` files from it into the path ``./data`` , such that now ``./data`` directory has 3 ``.bin`` files in it.
6. Run command ``pip install -r requirements.txt``   ( This would install ``opencv-python``, ``numpy``, ``flask``, ``regex``, ``ftfy``, ``plum-py`` python packages, if not found .)

    ### Extra steps (for Linux distributions Only.)

    7. Run command ``conda install -c conda-forge onednn-cpu-omp=2.6.0`` ( conda is the most sane way i could find to install onednn shared library, without getting frustrated due to GlibC mismatching.)

        * update the ``LD_LIBRARY_PATH`` to make ``dynamic linker`` search for ``shared objects`` in the Conda path (if     not already done!)

    8. Install ``openblas`` if not already included/installed with your OS.
        *   ``sudo dnf install openblas-devel`` (Fedora)
        *   ``sudo apt-get install openblas-dev``  (Ubuntu/Debian)

## Usage:
1. ``cd`` into the downloaded directory.
2.  Run command: ``caddy run``
3. Run command: ``python semantic_search.py``  OR ``python3 semantic_search.py``
4. Visit [http://localhost:5000](http://localhost:5000)


<details>
  <summary>RAM usage</summary>
  Server hovers at 1100 Mb of Ram usage, which also includes around 650 Mb of Ram by CLIP Machine-learning model.
  In future, idea is to use ``image-encoder`` only during indexing, which should save us about 350 Mb Ram usage.
</details>




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

