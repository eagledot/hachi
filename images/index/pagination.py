# PaginationCache.
# Encapsulate pagination concept.
# Idea is to save necessary meta-data generated during a Q (query) function.
# Meta-data includes data required by the T (transformation/collect) function, on user request for a particular page!
# Plus a query token!

from typing import Dict, Any, Iterable, Callable, TypedDict

class PaginationInfo(TypedDict):
    token:str    # unique Token to let query pagination cache!
    page_meta:Iterable[Any]  # generally meta-data generated during query, to be used by a T aka transformation function!

class PaginationCache(object):
    def __init__(self) -> None:
        self.__data:Dict[str, Iterable[Any]] = {}
    
    def add(self,
            info:PaginationInfo,  # generated during some kind of `query`, a fast-enough routine!
            ):
        
        self.__data[info["token"]] = info["page_meta"] # map token to the page_meta data. 

    def get(self,
            token:str,
            page_id:int,
        ) -> Any:
        # TODO: make the decision to pop some of older keys!
        return self.__data[token][page_id]

    def remove(
        self,
        token:str):
        # remove an entry from the cache. (it is necessary to call this if possible to keep the cache size limited!)
        # Generally some code can be sure, we won't need a particular token. so better to remove it
        _ = self.__data.pop(token)
        