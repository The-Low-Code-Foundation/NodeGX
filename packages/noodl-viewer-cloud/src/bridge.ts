/**
 * TODO: Define the different kind of inputs to the request node.
 */
export interface NoodlRequest {
  headers: {};
  body: string;
  /**
   * P127-BKO006-SCHEDULEAUTH: the app started this run itself (a schedule, a row change, a run from Studio). The
   * backend sets it in process and never from a caller's headers or body.
   */
  startedByApp?: boolean;
}

/**
 * TODO: Define the different kind of outputs on the response node.
 */
export interface NoodlResponse {
  statusCode: string;
  headers: {};
  body: string;
}
