// Main search service that handles search logic and state management

/* @anubhav Notes:
Main search service. We start with defaul state.
We perform/start a search. Now a pagination sequence is supposed to be followed.
So we first start/perform a search, with query.
We get the pagination info in return, This info can then be used to `collect` meta-data for 
a specific page. This way we consume only required resources and scale.

updateStates routine, call an eventHandler, based on the `arguments` passed to it.
Actual handlers are assigned in `image-search.ts`. here are dummy only!

`isLoading` is set to `true` whenever we start a search, i am setting it to `false` when we finished collecting the `first page`.
`isSearchDone` can be set to true, after `querying` part !

TODO: this is quite primitive... but renders the first page with new pagination API to atleast build from upon here.

*/


import type {
  HachiImageData,
  SearchState,
  SearchEvents,
  SearchRequestOptions,
} from "./types";
import { SearchApiService } from "./apiService";
import { transformRawDataChunk, mergePhotos } from "./utils";
import { CONFIG } from "./constants";

const POLLING_INTERVAL = CONFIG.POLLING_INTERVAL;

export class SearchService {
  private state: SearchState = {
    photos: [],
    isLoading: false,
    isSearchDone: false,
    error: null,
    selectedPhoto: null,
    currentPhotoIndex: null,
    pollingSearchTerm: "",
    clientId: null,
  };

  private events: SearchEvents;

  constructor(events: SearchEvents) {
    this.events = events;
  }

  /**
   * Gets the current state
   */
  getState(): Readonly<SearchState> {
    return { ...this.state };
  }

  /**
   * Updates state and triggers appropriate events
   */
  private updateState(updates: Partial<SearchState>): void {
    
    console.log("here i am with updates: ", updates)
    
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates }; // Trigger events for changed properties
    if (updates.photos !== undefined && updates.photos !== oldState.photos) {
      console.log("we got the photos... do somethign.. now!")
      this.events.onPhotosUpdate(this.state.photos);
    }
    if (
      updates.isLoading !== undefined &&
      updates.isLoading !== oldState.isLoading
    ) {
      this.events.onLoadingChange(this.state.isLoading);
    }
    if (updates.error !== undefined) {
      this.events.onErrorChange(this.state.error);
    }
    if (
      updates.isSearchDone !== undefined &&
      updates.isSearchDone !== oldState.isSearchDone
    ) {
      this.events.onSearchDoneChange(this.state.isSearchDone);
    }
  }

  /**
   * Starts a new search
   */
  async startSearch(searchTerm: string): Promise<void> {
    /* @anubhav This now does pagination sequence. (query and then collect!)
    IT queries and collect/render results for first page for now.
    TODO: call the `collect url` on `next button` whenever results are greater than page_size ! 
    First  `query` is done for releavant, searchTerm, which returns `pagination info` .
    This pagination info can then be levaraged during `collect` part of the sequence.
    Depending upon the page, we call it with relevant page-id.
    */

    // Default loading state!
    this.updateState({
      isLoading: true,
      error: null,
      isSearchDone: false,
      photos: [],
      pollingSearchTerm: searchTerm.trim(),
      clientId: null,
    });

    /* 
      Do a query and get the pagination info, to later "collect" specific pages
    */
    let query_url = "/api/query"
    let query_data = new FormData()
    query_data.append("query_start", String(true));
    query_data.append("query", searchTerm);
    query_data.append("page_size", String(200));

    const response = await fetch(query_url, {
      method: 'POST',
      body: query_data
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    // whatever the result. (Setting isLoading to False ?)
    // since querying was done. (now is just collecting!)
    // this.updateState({
    //   isLoading:false
    // });

    const query_result = await response.json(); // Parse the JSON response
    const query_token = query_result["query_token"]
    const n_pages = query_result["n_pages"]
    // const n_matches_found = result["n_matches_found"] // TODO:
    // const latency = result["latency"] // TODO
    
    //TODO: define the proper type for Query response,
    // basically pagination info, like how many pages, how many results were in total, latency and stuff!

    /*
      Collect first/zeroth page to actually display some results/photos!
      We will need a combination of `query_token` and `page_id` to collect the results for a particular page!  
    */
    const collect_url = "/api/collectQueryMeta/" + query_token + "/" + String(0);
    const response_collect = await fetch(
      collect_url,
      {
        method:"GET"
      }
    )
    if (!response_collect.ok) {
      throw new Error('Network response was not ok');
    }

    let rawData = await response_collect.json();
    console.log("Got matches: ", (rawData.data_hash).length);
    this.updateState({
      isLoading:false
    });

    /*
    Once we get the `meta-data` i.e arrays for Scores, meta-data, and resource-hashes.
    We do whatever transformation and mergePhotos stuff!
    Then we provide these updates to the `updateState` routine. which will,
    based on the `updates` values, will trigger one of `event handler` based on condition matching!
    */
    
    const newPhotosChunk = transformRawDataChunk(rawData);
    const updatedPhotos = mergePhotos(this.state.photos, newPhotosChunk);

    if (newPhotosChunk.length) {
      this.updateState({
        photos: updatedPhotos,
        isSearchDone: true,
        isLoading:false  // already set, should it set it again here now!
      });
    }

    // await this.performSearch(searchTerm, { isInitialSearch: true });
  }

  /**
   * Performs a search request
   */
  private async performSearch(
    searchTerm: string,
    options: SearchRequestOptions
  ): Promise<void> {
    console.log("perform search was called ..");
    // here i need to just get the query token..
    // and then save it somewhere!
    // later during pagination.. 
    // call the corresponding page to render!


    try {
      const rawData = await SearchApiService.searchImages(searchTerm, {
        ...options,
        clientId: this.state.clientId || undefined,
      });
      
      // get the rawData from the token!
      console.log("after performing search: ", rawData);

      // Update client ID if this is an initial search
      // if (options.isInitialSearch && rawData.client_id) {
      //   this.updateState({ clientId: rawData.client_id });
      // }

      // Transform and merge photos
      // const newPhotosChunk = transformRawDataChunk(rawData);
      // const updatedPhotos = mergePhotos(this.state.photos, newPhotosChunk);

      // if (newPhotosChunk.length) {
      //   this.updateState({
      //     photos: updatedPhotos,
      //   });
      // }

      // Handle search completion or start polling
      
      rawData.query_completed = false;
      if (rawData.query_completed) {
        console.log("querying is done..");
        // now what!

        // at this point, we update the state..
        // here all that stuff happens?

        // fields have been updated or not, 
        // based on the update fields, 
        // updateState routine.. will do stuff..
        // 

        this.updateState({ isLoading: false, isSearchDone: true });
      } else if (options.isInitialSearch) {
        this.startPolling();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      this.updateState({
        error: errorMessage,
        isLoading: false,
        isSearchDone: true,
      });
      console.error("Search error:", error);
    }
  }

  /**
   * Starts polling for search updates
   */
  private async startPolling(): Promise<void> {
    while (this.state.pollingSearchTerm && !this.state.isSearchDone) {
      await this.performSearch(this.state.pollingSearchTerm, {
        isInitialSearch: false,
      });
    }
  }

  /**
   * Selects a photo and sets the current index
   */
  selectPhoto(photo: HachiImageData): void {
    const index = this.state.photos.findIndex((p) => p.id === photo.id);
    if (index !== -1) {
      this.updateState({
        selectedPhoto: photo,
        currentPhotoIndex: index,
      });
    }
  }

  /**
   * Clears the selected photo
   */
  clearSelection(): void {
    this.updateState({
      selectedPhoto: null,
      currentPhotoIndex: null,
    });
  }

  /**
   * Navigates to the next photo
   */
  nextPhoto(): void {
    const { currentPhotoIndex, photos } = this.state;
    if (currentPhotoIndex !== null && currentPhotoIndex < photos.length - 1) {
      const nextIndex = currentPhotoIndex + 1;
      this.updateState({
        currentPhotoIndex: nextIndex,
        selectedPhoto: photos[nextIndex],
      });
    }
  }

  /**
   * Navigates to the previous photo
   */
  previousPhoto(): void {
    const { currentPhotoIndex, photos } = this.state;
    if (currentPhotoIndex !== null && currentPhotoIndex > 0) {
      const prevIndex = currentPhotoIndex - 1;
      this.updateState({
        currentPhotoIndex: prevIndex,
        selectedPhoto: photos[prevIndex],
      });
    }
  }

  /**
   * Checks if can navigate to next photo
   */
  canGoNext(): boolean {
    const { currentPhotoIndex, photos } = this.state;
    return currentPhotoIndex !== null && currentPhotoIndex < photos.length - 1;
  }

  /**
   * Checks if can navigate to previous photo
   */
  canGoPrevious(): boolean {
    const { currentPhotoIndex } = this.state;
    return currentPhotoIndex !== null && currentPhotoIndex > 0;
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    // This gets called before the page is refreshed or navigated away
  }
}
