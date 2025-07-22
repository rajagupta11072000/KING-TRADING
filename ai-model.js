import * as tf from '@tensorflow/tfjs';

let model = null;
export async function loadModel() {
  if (!model) {
    model = await tf.loadLayersModel('./model.json');
  }
  return model;
}

export async function aiScore(features) {
  const mdl = await loadModel();
  const input = tf.tensor2d([features]);
  const out = mdl.predict(input);
  const val = out.dataSync()[0];
  return val;
}
