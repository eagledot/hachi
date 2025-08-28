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
    """
    NOTE: it should be remembered, that for each token/key, originally generated page meta-data would remain same, not supposed to be ovewritten.
    It is possible, that some page-meta data was not available during page-info generation, we may sometimes overwrite that if some other route/call happen to need that missing data!

    For example, in case of `pure semantic` query, we will query the `meta-index` for only a given page on `collect meta` routine.
    In this case `row indices (for meta-index)` are queried/generated on demand only for that page, from `resource hashes` (Which comes from image-index).
    Such `row-indices` are now available and can be commited/overwritten in-place of None. Otherwise any not-NONE data is not supposed to be overwritten!

    For now we naively assume, that not any concurrent `indexing` would be taking place. Even then, may get some some very minor difference in results!
    
    """
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

    def overwrite(self,
            token:str,
            page_id:int,
            page_meta:Any  # generally a tuple!
            ):
        # NOTE: Used for some scenarios, like `filtering` for an attribute given a value,
        # Read class description.
        assert page_id < len(self.__data[token])
        assert type(page_meta) == type(self.__data[token][0])  # same (base class) type of meta-data is being overwritten, just to be sure!
        self.__data[token][page_id] = page_meta 

    def get_pages_count(
            self,
            token:str
    ) -> int:
        return len(self.__data[token])
    
    def remove(
        self,
        token:str,
        only_if_exists:bool = False):
        # remove an entry from the cache. (it is necessary to call this if possible to keep the cache size limited!)
        # Generally some code can be sure, we won't need a particular token. so better to remove it
        if only_if_exists:
            if token in self.__data:
                _ = self.__data.pop(token)
        else:
            _ = self.__data.pop(token)
        