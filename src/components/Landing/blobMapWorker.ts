import { rasterBlobMap } from './lensMath';

// Off-thread blob-map raster: the merged-lens displacement map's SDF loop (~600k px,
// 5 SDF evals each) blew the merged-drag frame budget on the main thread (50fps vs the
// vsync cap everywhere else — measured, see lensEngine's bridge). Here it rasters at
// full quality, encodes via convertToBlob, and posts the blob back; lensEngine turns it
// into an object URL for the feImage. One request in flight at a time (the engine holds
// the latest geometry as pending), so no queue can build up.

export interface BlobMapRequest {
  id: number;
  x1: number; y1: number; r1: number;
  x2: number; y2: number; r2: number;
  bx0: number; by0: number; bw: number; bh: number;
}

export interface BlobMapResponse {
  id: number;
  blob: Blob;
}

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<BlobMapRequest>) => void) | null;
  postMessage(msg: BlobMapResponse): void;
};

scope.onmessage = (e) => {
  const { id, x1, y1, r1, x2, y2, r2, bx0, by0, bw, bh } = e.data;
  const { cw, ch, data } = rasterBlobMap(x1, y1, r1, x2, y2, r2, bx0, by0, bw, bh);
  const c = new OffscreenCanvas(cw, ch);
  const c2d = c.getContext('2d')!;
  c2d.putImageData(new ImageData(data, cw, ch), 0, 0);
  c.convertToBlob().then((blob) => scope.postMessage({ id, blob }));
};
