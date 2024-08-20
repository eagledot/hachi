from . import clip_python_module as clip_model
import numpy as np

from typing import Any, Union, List
from .simple_tokenizer import SimpleTokenizer as _Tokenizer

_tokenizer = _Tokenizer()


def tokenize(
    texts: Union[str, List[str]], context_length: int = 77, truncate: bool = False
):
    """
    Tokenize the text, taken from openAI/CLIP/clip/simple_tokenizer.py
    
    Returns the tokenized representation of given input string(s)

    Parameters
    ----------
    texts : Union[str, List[str]]
        An input string or a list of input strings to tokenize

    context_length : int
        The context length to use; all CLIP models use 77 as the context length

    truncate: bool
        Whether to truncate the text in case its encoding is longer than the context length

    Returns
    -------
    A two-dimensional tensor containing the resulting tokens, shape = [number of input strings, context_length].
    Returns np.int64 array. to be cosumed by encode_text routine.
    """
    if isinstance(texts, str):
        texts = [texts]

    sot_token = _tokenizer.encoder["<|startoftext|>"]
    eot_token = _tokenizer.encoder["<|endoftext|>"]
    all_tokens = [[sot_token] + _tokenizer.encode(text) + [eot_token] for text in texts]
    result = np.zeros((len(all_tokens), context_length), dtype=np.int64)

    for i, tokens in enumerate(all_tokens):
        if len(tokens) > context_length:
            if truncate:
                tokens = tokens[:context_length]
                tokens[-1] = eot_token
            else:
                raise RuntimeError(
                    f"Input {texts[i]} is too long for context length {context_length}"
                )
        result[i, : len(tokens)] = np.array(tokens).astype(np.int64)

    return result


# load text module.
def load_text_transformer(weightsFile: str):
    clip_model.load_text_transformer(weightsFile)


def load_vit_b32Q(weightsFile: str):
    clip_model.load_vit_b32Q(weightsFile)


def load_vit_b32(weightsFile: str):
    clip_model.load_vit_b32(weightsFile)


# image features.
def encode_image(image, is_bgr: bool, center_crop: bool = True):
    # image: np array uint8 data. RGB/BGR data in  format [H,W,3]
    # is_bgr: indicating that image contains BGR data. otherwise set to false.
    # center_crop: use center cropping during preprocessing of raw image.

    embeddings = np.empty((1, 512), dtype=np.float32)
    clip_model.encode_image(
        image, embeddings[0], is_bgr=is_bgr, center_crop=center_crop
    )
    return embeddings


# text features.
def encode_text(texts: Union[str, List[str]]):
    # tokenize text
    text_input = tokenize(texts)  # [N, context_length] for np.int64 type.
    output = []
    for i in range(text_input.shape[0]):
        embeddings = np.empty((512), dtype=np.float32)
        clip_model.encode_text(text_input[i], embeddings)
        output.append(embeddings.reshape((1, embeddings.shape[0])))
    return np.concatenate(output, axis=0)
