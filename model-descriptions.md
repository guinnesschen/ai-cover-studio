[https://replicate.com/replicate/fast-flux-trainer/train](https://replicate.com/replicate/fast-flux-trainer/train)

[https://replicate.com/black-forest-labs/flux-pro-finetuned](https://replicate.com/black-forest-labs/flux-pro-finetuned)

[https://replicate.com/zsxkib/create-rvc-dataset](https://replicate.com/zsxkib/create-rvc-dataset)

[https://replicate.com/replicate/train-rvc-model](https://replicate.com/replicate/train-rvc-model)

[https://replicate.com/zsxkib/sonic](https://replicate.com/zsxkib/sonic)

[https://replicate.com/zsxkib/realistic-voice-cloning](https://replicate.com/zsxkib/realistic-voice-cloning)

The pipeline is:

1. Train the voice + image models

2. The user creates a new vivid cover by supplying a link to an audio file or YouTube video

A. We use the flux LoRA with a prompt like "generate an image of TOK on stage performing" (where TOK is the special token used to train the subject)

B. We use the RVC v2 model and the song input to create the voice cloned song cover. We do this twice, one with regular sensible perameters to get a well mixed full audio at the end, and once with params to get a purely voice cloned isolation with no background music.

C. We use the sonic image + audio -> video generator to make a video of the user singing the song according to the still. We use the pure isolated vocals as input for this one.

D. We stitch together the video and the full mixed audio.

Here is informationa bout each of the replicate models

## Basic model info

Model name: zsxkib/sonic
Model description: Generates realistic talking face animations from a portrait image and audio using the CVPR 2025 Sonic model

## Model inputs

- image: Input portrait image (will be cropped if face is detected). (string)
- audio: Input audio file (WAV, MP3, etc.) for the voice. (string)
- dynamic_scale: Controls movement intensity. Increase/decrease for more/less movement. (number)
- min_resolution: Minimum image resolution for processing. Lower values use less memory but may reduce quality. (integer)
- inference_steps: Number of diffusion steps. Higher values may improve quality but take longer. (integer)
- keep_resolution: If true, output video matches the original image resolution. Otherwise uses the min_resolution after cropping. (boolean)
- seed: Random seed for reproducible results. Leave blank for a random seed. (integer)

## Model output schema

{
"type": "string",
"title": "Output",
"format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.

## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example ([https://replicate.com/p/rrf1abag31rj20cnzgzrv5rbcg](https://replicate.com/p/rrf1abag31rj20cnzgzrv5rbcg))

Input

```json
{
  "seed": 42,
  "audio": "https://raw.githubusercontent.com/jixiaozhong/Sonic/main/examples/wav/sing_female_10s.wav",
  "image": "https://raw.githubusercontent.com/jixiaozhong/Sonic/main/examples/image/hair.png",
  "dynamic_scale": 1,
  "min_resolution": 512,
  "inference_steps": 25,
  "keep_resolution": false
}
```

Output

```json
"https://replicate.delivery/yhqm/BBIQVop2woqcFNiXmkKeDwu68U5oEc5qCrmLLhp726cS1iPKA/output.mp4"
```

## Model readme

> # Sonic: Talking Face Animation 🗣️ (CVPR 2025)
>
> This Replicate model runs **Sonic**, a state-of-the-art method for generating realistic talking face animations from a single portrait image and an audio file.
>
> Based on the research paper: [**Sonic: Shifting Focus to Global Audio Perception in Portrait Animation (CVPR 2025)**](https://arxiv.org/abs/2411.16331).
> Original Project: [**Sonic Project Page**](https://jixiaozhong.github.io/Sonic/)
>
> ## About the Sonic Model
>
> Sonic introduces a novel approach to audio-driven portrait animation by emphasizing **global audio perception**. Instead of relying solely on local lip-sync cues, it considers broader audio characteristics to generate more natural and expressive facial movements, including subtle head poses and expressions that match the audio's tone and rhythm. The goal is to create animations that appear more holistic and less "puppet-like."
>
> ## Key Features & Capabilities ✨
>
> - **Expressive Animation**: Generates animations with nuanced facial expressions and subtle head movements derived from global audio features.>
> - **High-Quality Lip Sync**: Accurately synchronizes lip movements with the input audio.>
> - **Single Image Input**: Requires only one portrait image (works best with frontal or near-frontal views).>
> - **Handles Various Audio**: Processes standard audio file formats (WAV, MP3, etc.).>
> - **Robust Face Handling**: Includes face detection (YOLOv5) and cropping for optimal processing, gracefully falling back to the original image if no face is detected.
>
> ## Replicate Implementation Details ⚙️
>
> This Cog container packages the Sonic model and its dependencies for easy use on Replicate.>
> - **Core Model**: Utilizes the pre-trained weights provided by the original Sonic authors (`LeonJoe13/Sonic` on Hugging Face).>
> - **Dependencies**: Runs on PyTorch and leverages libraries like `diffusers`, `transformers`, `pydub`, and `Pillow`. Key components from the original research likely include architectures related to Stable Video Diffusion (SVD), Whisper (for audio encoding), and RIFE (for temporal consistency).>
> - **Weight Handling**: Model weights for Sonic and its sub-components (SVD, Whisper, RIFE, YOLO) are efficiently downloaded using `pget` during the container build from a Replicate cache and stored locally (`checkpoints/` directory).>
> - **Workflow (**`predict.py`**)**: >
>   1. Loads models into GPU memory during setup (`setup` method).>
>   2. Receives image and audio inputs.>
>   3. Performs preprocessing: saves image as PNG, converts audio to WAV, runs face detection/cropping.>
>   4. Calls the main `self.pipe.process()` function, passing the processed image, audio path, and user-configurable parameters (like `dynamic_scale`, `inference_steps`, `min_resolution`, `keep_resolution`, `seed`).>
>   5. Outputs the resulting animation as an MP4 video.
>
> ## Underlying Technologies & Concepts 🔬
>
> Sonic builds upon advancements in several areas:>
> - **Audio Feature Extraction**: Likely uses models like Whisper to encode rich features from audio.>
> - **Diffusion Models for Video**: Leverages techniques similar to Stable Video Diffusion for generating coherent video frames.>
> - **Face Detection**: Employs YOLOv5 for accurate face localization.>
> - **Frame Interpolation**: Potentially uses methods like RIFE to enhance temporal smoothness between generated frames.>
> - **Global Audio Perception**: The core novelty, focusing on mapping broader audio characteristics to facial dynamics.
>
> ## Use Cases 💡
>
> - Animating avatars for virtual assistants, games, or social media.>
> - Creating engaging video content from static images and voiceovers.>
> - Developing accessibility tools.>
> - Entertainment and creative projects.
>
> ## Limitations ⚠️
>
> - Best results are achieved with clear, high-resolution, relatively frontal portrait images. Extreme poses or obstructions may degrade quality.>
> - Primarily focuses on animating the face and subtle head movements; does not generate large pose changes or body movements.>
> - Lip-sync accuracy can be affected by audio quality (e.g., background noise, unclear speech).>
> - The mapping from audio to expression is learned and may not capture *every* nuance intended by a human speaker.
>
> ## License & Disclaimer 📜
>
> This model is based on the original Sonic research, licensed under **CC BY-NC-SA 4.0**.
>
> **For non-commercial research use ONLY.**
>
> Commercial use requires separate licensing. See the original repository or [Tencent Cloud Video Creation Large Model](https://cloud.tencent.com/product/vclm) for commercial options. Users must comply with the license terms and applicable laws.
>
> ## Citation 📚
>
> Please cite the original Sonic paper if you use this model in your research:
>
> ```bibtex
> @article{ji2024sonic,
>   title={Sonic: Shifting Focus to Global Audio Perception in Portrait Animation},
>   author={Ji, Xiaozhong and Hu, Xiaobin and Xu, Zhihong and Zhu, Junwei and Lin, Chuming and He, Qingdong and Zhang, Jiangning and Luo, Donghao and Chen, Yi and Lin, Qin and others},
>   journal={arXiv preprint arXiv:2411.16331},
>   year={2024}
> }
> 
> ```
>
> ---
>
> Cog implementation managed by [zsxkib](https://replicate.com/zsxkib).
>
> Star the Cog repo on [GitHub](https://github.com/zsxkib/cog-sonic)! ⭐
>
> Follow me on [Twitter/X](https://x.com/zsakib_)

## Basic model info

Model name: zsxkib/realistic-voice-cloning
Model description: Create song covers with any RVC v2 trained AI voice from audio files.

## Model inputs

- song_input: Upload your audio file here. (string)
- rvc_model: RVC model for a specific voice. If using a custom model, this should match the name of the downloaded model. If a 'custom_rvc_model_download_url' is provided, this will be automatically set to the name of the downloaded model. (string)
- custom_rvc_model_download_url: URL to download a custom RVC model. If provided, the model will be downloaded (if it doesn't already exist) and used for prediction, regardless of the 'rvc_model' value. (string)
- pitch_change: Adjust pitch of AI vocals. Options: `no-change`, `male-to-female`, `female-to-male`. (string)
- index_rate: Control how much of the AI's accent to leave in the vocals. (number)
- filter_radius: If >=3: apply median filtering median filtering to the harvested pitch results. (integer)
- rms_mix_rate: Control how much to use the original vocal's loudness (0) or a fixed loudness (1). (number)
- pitch_detection_algorithm: Best option is rmvpe (clarity in vocals), then mangio-crepe (smoother vocals). (string)
- crepe_hop_length: When `pitch_detection_algo` is set to `mangio-crepe`, this controls how often it checks for pitch changes in milliseconds. Lower values lead to longer conversions and higher risk of voice cracks, but better pitch accuracy. (integer)
- protect: Control how much of the original vocals' breath and voiceless consonants to leave in the AI vocals. Set 0.5 to disable. (number)
- main_vocals_volume_change: Control volume of main AI vocals. Use -3 to decrease the volume by 3 decibels, or 3 to increase the volume by 3 decibels. (number)
- backup_vocals_volume_change: Control volume of backup AI vocals. (number)
- instrumental_volume_change: Control volume of the background music/instrumentals. (number)
- pitch_change_all: Change pitch/key of background music, backup vocals and AI vocals in semitones. Reduces sound quality slightly. (number)
- reverb_size: The larger the room, the longer the reverb time. (number)
- reverb_wetness: Level of AI vocals with reverb. (number)
- reverb_dryness: Level of AI vocals without reverb. (number)
- reverb_damping: Absorption of high frequencies in the reverb. (number)
- output_format: wav for best quality and large file size, mp3 for decent quality and small file size. (string)

## Model output schema

{
"type": "string",
"title": "Output",
"format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.

## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example ([https://replicate.com/p/imxvh7jbwwvell3fwpcpxommlm](https://replicate.com/p/imxvh7jbwwvell3fwpcpxommlm))

Input

```json
{
  "protect": 0.5,
  "rvc_model": "CUSTOM",
  "index_rate": 1,
  "song_input": "https://replicate.delivery/pbxt/JvgakOpSJzQRSNYymHq2gKmQws48cye3DlCSL55qxu9f5YQt/taylor-trim.mp3",
  "reverb_size": 0.6,
  "pitch_change": "female-to-male",
  "rms_mix_rate": 0.8,
  "filter_radius": 3,
  "output_format": "mp3",
  "reverb_damping": 0.7,
  "reverb_dryness": 0.8,
  "reverb_wetness": 0.3,
  "crepe_hop_length": 8,
  "pitch_change_all": 0,
  "main_vocals_volume_change": 3,
  "pitch_detection_algorithm": "mangio-crepe",
  "instrumental_volume_change": 0,
  "backup_vocals_volume_change": -10,
  "custom_rvc_model_download_url": "https://weights.replicate.delivery/default/rvc/SamA.zip"
}
```

Output

```json
"https://replicate.delivery/pbxt/MdNcQoik3A6NCFYm2JWtQIkPVeqRdusuDf7Bok2VvxICXY7RA/tmp4rkutngetaylor-trim%20%28SamA%20Ver%29.mp3"
```

## Model readme

> # Realistic Voice Cloning v2 (RVC v2) 🎙️🎭
>
> ## Overview 🔊
>
> **Realistic Voice Cloning v2 (RVC v2)** is a voice-to-voice model that transforms an input voice into a target voice. This tool is built upon the amazing work of [SociallyIneptWeeb](https://www.youtube.com/@sociallyineptweeb/featured). We've wrapped his [AICoverGen](https://github.com/SociallyIneptWeeb/AICoverGen) repo to work on Replicate! Allowing us to create AI songs with any RVCv2 model on the web!
>
> Support SociallyIneptWeeb and learn more about his work through:>
> - [Showcase Video](https://www.youtube.com/watch?v=2qZuE4WM7CM)>
> - [Setup Guide](https://www.youtube.com/watch?v=pdlhk4vVHQk)
>
> ## Pre-loaded Model 🦑
>
> The RVC v2 comes pre-loaded with the **Squidward** voice model for immediate use.
>
> ## Getting Other Voices 💥
>
> You can expand your RVC v2's capabilities by downloading additional models from places like [QuickWick's Music-AI-Voices Hugging Face Repository](https://huggingface.co/QuickWick/Music-AI-Voices). Here's how:>
> 1. Visit the repository and go to [Files and Versions](https://huggingface.co/QuickWick/Music-AI-Voices/tree/main)>
> 2. Select a model, such as the `Music-AI-Voices/2Pac Tupac (RVC) 150 Epoch`. It's important to pick a model which has "(RVC)" in the name>
> 3. Then click on the `.zip` file to access the model's download page,
>    e.g., [2Pac Tupac (RVC) 150 Epoch](https://huggingface.co/QuickWick/Music-AI-Voices/blob/main/2Pac%20Tupac%20\(RVC\)%20150%20Epoch/2Pac%20Tupac%20\(RVC\)%20150%20Epoch.zip)>
> 4. Right click on the download button and copy the link address - e.g. download URL: `https://huggingface.co/QuickWick/Music-AI-Voices/resolve/main/2Pac%20Tupac%20(RVC)%20150%20Epoch/2Pac%20Tupac%20(RVC)%20150%20Epoch.zip?download=true` as `custom_rvc_model_download_url`>
> 5. Select the model to use (once it's automatically downloaded) `rvc_model = "CUSTOM"`
>
> *Note: Ensure that the* `rvc_model` *and* `custom_rvc_model_download_name` *match, as they represent the chosen model and the name of the downloaded model file, respectively.*
>
> Another good websites to find RVC (v2) models are [voice-models](https://voice-models.com/)
>
> ## Terms of Use 📚
>
> The use of the converted voice for the following purposes is prohibited.>
> - Criticizing or attacking individuals.>
> - Advocating for or opposing specific political positions, religions, or ideologies.>
> - Publicly displaying strongly stimulating expressions without proper zoning.>
> - Selling of voice models and generated voice clips.>
> - Impersonation of the original owner of the voice with malicious intentions to harm/hurt others.>
> - Fraudulent purposes that lead to identity theft or fraudulent phone calls.
>
> ## Disclaimer ‼️
>
> I am not liable for any direct, indirect, consequential, incidental, or special damages arising out of or in any way connected with the use/misuse or inability to use this software.

## Basic model info

Model name: replicate/train-rvc-model
Model description: Train your own custom RVC model

## Model inputs

- dataset_zip: Upload dataset zip, zip should contain `dataset/<rvc_name>/split_<i>.wav` (string)
- sample_rate: Sample rate (string)
- version: Version (string)
- f0method: F0 method, `rmvpe_gpu` recommended. (string)
- epoch: Epoch (integer)
- batch_size: Batch size (string)

## Model output schema

{
"type": "string",
"title": "Output",
"format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.

## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example ([https://replicate.com/p/opl6jylbuhb54lskbcuaj7dxfi](https://replicate.com/p/opl6jylbuhb54lskbcuaj7dxfi))

Input

```json
{
  "epoch": 80,
  "version": "v2",
  "f0method": "rmvpe_gpu",
  "batch_size": "7",
  "dataset_zip": "https://replicate.delivery/pbxt/Jve3yEeLYIoklA2qhn8uguIBZvcFNLotV503kIrURbBOAoNU/dataset_sam_altman.zip",
  "sample_rate": "48k"
}
```

Output

```json
"https://replicate.delivery/pbxt/lN9zQPTvPBaWEVUyLmvclC3nT1CDrOBAFjzGj15MyrV7j1eIA/sam_altman.zip"
```

## Model readme

> Realistic Voice Cloning v2 (RVC v2) is a voice-to-voice model that can transform any input voice into a target voice. You can dive into it on RVC v2 Web UI on Replicate.
>
> ---
>
> Now that you've [crafted your dataset](https://replicate.com/zsxkib/create-rvc-dataset), the next phase is training the RVC model to mimic your target voice. Replicate offers two pathways for training: [Train RVC Model Web UI](https://replicate.com/replicate/train-rvc-model) or [Colab Notebook](https://colab.research.google.com/drive/1G-OEJlcIfq-3v6GMlt12D09tuArqsJOF?usp=sharing).
>
> To initiate training, you'll need to provide several parameters:
>
> - `dataset_zip`: The URL or direct upload of your dataset zip file.
> - `sample_rate`: The audio sampling rate, which should typically be set to the default of 48k.
> - `version`: Opt between RVC v1 and v2, with v2 recommended for superior quality.
> - `f0method`: The method used to extract speech formants, with 'rmvpe_gpu' as the suggested default.
> - `epoch`: The number of complete passes over the dataset the model will perform.
> - `batch_size`: The number of data points processed in one optimization step; the default of 7 is optimal for most scenarios.
>
> The training output will be a model packaged in a zip file if using the Web UI, or a URL to the trained model when using the API, similar to dataset creation.
>
> ## **Training Web UI Method**
>
> 1. Visit the [Train RVC Model](https://replicate.com/replicate/train-rvc-model) on Replicate.
> 2. Upload your dataset zip file directly.
> 3. Optionally, configure the training parameters . We recommend sticking to the default values for `sample_rate` (48k), `version` (v2 for higher quality), `f0method` (rmvpe_gpu), `epoch` (the number of full dataset passes), and `batch_size` (7 is a good starting point).
> 4. Start the training. Once completed, you can download your trained model or copy the URL for inference.
>
> ## **Method 2: Using the API via Colab Notebook**
>
> For the API method, ensure you have the URL of your dataset ready. This could be from the output of the dataset creation step or obtained by re-uploading the dataset using the `SERVING_URL` command.
>
> 1. Open the [Colab Notebook](https://colab.research.google.com/drive/1G-OEJlcIfq-3v6GMlt12D09tuArqsJOF?usp=sharing).
> 2. Run the training code cell, replacing `"your_dataset_zip_url"` with the actual URL of your dataset:
>
> `python > # Insert the URL of your dataset > training_output = replicate.run( >   "replicate/train-rvc-model:cf360587a27f67500c30fc31de1e0f0f9aa26dcd7b866e6ac937a07bd104bad9", >   input={ >     "dataset_zip": "your_dataset_zip_url", >     "sample_rate": "48k", >     "version": "v2", >     "f0method": "rmvpe_gpu", >     "epoch": 50, >     "batch_size": 7 >   } > ) > print(training_output) > `
>
> 1. After the script completes, you’ll get a URL to your newly trained model, all set for the next stage: running inference.
>
> # **Running Inference with Your Trained Model**
>
> With your RVC model now finely tuned, the final step is to put it to work by running inference. This is where your model starts cloning voices. The process differs slightly between using the Web UI and the API.
>
> ## **Setting Up for Inference**
>
> For both the Web UI and API, you'll set `rvc_model` to `CUSTOM`. This tells the system you're using a unique model tailored by you. You'll also need the URL to your trained model. This should be the output URL from your model training step. If you've lost this URL, refer to the earlier section on how to re-upload and retrieve your model.
>
> ## **Inference via Web UI Method**
>
> 1. Go to the [Realistic Voice Cloning UI](https://replicate.com/zsxkib/realistic-voice-cloning).
> 2. Upload your input audio file directly to the interface.
> 3. In the `rvc_model` field, select `CUSTOM`.
> 4. Paste the URL of your trained model into the `custom_rvc_model_download_url` field.
> 5. Configure additional parameters as needed to fine-tune the output.
> 6. Run the model and wait for the output. You'll be able to play the cloned voice directly or download it.

## Basic model info

Model name: replicate/fast-flux-trainer
Model description: Train subjects or styles faster than ever

## Model inputs

- txt: some words (string)

## Model output schema

{
"type": "string",
"title": "Output"
}

If the input or output schema includes a format of URI, it is referring to a file.

## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example ([https://replicate.com/p/extwjt3509rma0cpztp8s799yw](https://replicate.com/p/extwjt3509rma0cpztp8s799yw))

Input

```json
{
  "txt": "hi"
}
```

Output

```json
"predict on this model is a no-op"
```

## Model readme

> ### Replicate fast Flux Lora trainer
>
> Fine-tunes flux, fast!
>
> ### How to train:
>
> Upload a zip file of images that contains the style or subject you want to train the model on.
>
> Select a `trigger_word` that the model will learn to associate with your subject or style, and select `subject` or `style` as the type of fine-tuning you're trying to run.
>
> We'll run an autocaptioning model on the input images that will generate captions which contain your trigger word. You can also provide your own captions. To do so, add a `.txt` file that contains a caption for each image you want to caption in the zip file you upload - for example, `img_0.jpg` would be captioned by `img_0.txt`.
>
> For `Destination` select/create an empty Replicate model location to store your LoRAs.
>
> ### Dataset Size and Image Resolution
>
> - Aim for a dataset of 10-20 images of your subject
> - Images with resolutions around 1024x1024 are ideal
> - Very large images will be scaled down to fit aspect ratios around 1024 resolutions
>
> ### Image selection
>
> - For style LoRAs select images that highlight distinctive features of the style, use varied subjects but keep the style consistent
> - For style LoRAs avoid datasets where certain elements dominate
> - For character LoRAs use images of the subject in different settings, facial expressions, and backgrounds.
> - For character LoRAs avoid different haircuts or ages, and showing hands in a lot of face framing positions as we found this led to more hand hallucinations
>
> ## How to Run your Flux fine tune
>
> After training is complete you will be able to run your LoRA in a new Replicate model at the `destination` location
>
> ## How to train with the API
>
> To run a training from the API, you'll still need to gather a zip file of images and select or create a model on Replicate as the destination for your training. Unlike in the UI, you'll also need to upload the zip file to your storage platform of choice. You'll also need to get a [Replicate API token](https://replicate.com/docs/reference/http#authentication).
>
> Once you have those things ready, you can call the training API like so:
>
> `> curl -X POST \ >   -H "Authorization: Bearer $REPLICATE_API_TOKEN" \ >   -H "Content-Type: application/json" \ >   -d '{ >         "destination": "your-username/your-model-name", >         "input": { >             "input_images": "<your-training-data-url>", >             "trigger_word": "<some-unique-string>", >             "lora_type": "subject" >         } >     }' \ >   https://api.replicate.com/v1/models/replicate/fast-flux-trainer/versions/8b10794665aed907bb98a1a5324cd1d3a8bea0e9b31e65210967fb9c9e2e08ed/trainings >`
>
> This will start the training and return a JSON with training metadata. You can check on the status of the training at [replicate.com/trainings](https://replicate.com/trainings) or programmatically through the API like so:
>
> `> curl -s \ >   -H "Authorization: Bearer $REPLICATE_API_TOKEN" \ >   https://api.replicate.com/v1/trainings/<training_id> >`

## Basic model info

Model name: black-forest-labs/flux-pro-finetuned
Model description: Inference model for FLUX.1 [pro] using custom `finetune_id`

## Model inputs

- prompt: Text prompt for image generation (string)
- finetune_id: Finetune ID for making images using a previously trained fine-tune. Only IDs from trainings made using Replicate's Flux Pro fine-tuning model are supported. (string)
- finetune_strength: Controls finetune influence (number)
- image_prompt: Image to use with Flux Redux. This is used together with the text prompt to guide the generation towards the composition of the image_prompt. Must be jpeg, png, gif, or webp. (string)
- aspect_ratio: Aspect ratio for the generated image (string)
- width: Width of the generated image in text-to-image mode. Only used when aspect_ratio=custom. Must be a multiple of 32 (if it's not, it will be rounded to nearest multiple of 32). Note: Ignored in img2img and inpainting modes. (integer)
- height: Height of the generated image in text-to-image mode. Only used when aspect_ratio=custom. Must be a multiple of 32 (if it's not, it will be rounded to nearest multiple of 32). Note: Ignored in img2img and inpainting modes. (integer)
- prompt_upsampling: Automatically modify the prompt for more creative generation (boolean)
- steps: Number of diffusion steps (integer)
- guidance: Controls the balance between adherence to the text prompt and image quality/diversity. Higher values make the output more closely match the prompt but may reduce overall image quality. Lower values allow for more creative freedom but might produce results less relevant to the prompt. (number)
- safety_tolerance: Safety tolerance, 1 is most strict and 6 is most permissive (integer)
- seed: Random seed. Set for reproducible generation (integer)
- output_format: Format of the output images. (string)

## Model output schema

{
"type": "string",
"title": "Output",
"format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.

## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example ([https://replicate.com/p/sjcjsnbm2nrma0cq6pj9w62nqw](https://replicate.com/p/sjcjsnbm2nrma0cq6pj9w62nqw))

Input

```json
{
  "steps": 40,
  "prompt": "A formula one CYBERCAB car",
  "guidance": 3,
  "finetune_id": "fc14d7bf-95bd-4dde-92c1-2dd7317721f6",
  "aspect_ratio": "3:2",
  "output_format": "jpg",
  "safety_tolerance": 2,
  "finetune_strength": 1,
  "prompt_upsampling": false
}
```

Output

```json
"https://replicate.delivery/xezq/1tqX4qNG67ZANNXKauc0CVReVmclyKe53FazX2mqnJC6RJzUA/tmpspn25fph.jpg"
```

## Model readme

> # FLUX.1 [pro] - Finetuned
>
> This model builds upon **FLUX.1 [pro]**, adding the powerful capability to use custom finetunes.
>
> ## Finetuning
>
> This model requires a `finetune_id` corresponding to a finetune you have trained.>
> - `finetune_id`** (required):** Provide the ID of your trained finetune.>
> - `finetune_strength`** (optional, default=1):** Control the influence of your finetune on the final output. Values range from 0 (no finetune effect) to 2 (stronger effect).
>
> **To train your own finetune**, please visit the training page: [black-forest-labs/flux-pro-trainer](https://replicate.com/black-forest-labs/flux-pro-trainer)
>
> # License
>
> By using FLUX.1 [pro] finetuned through Replicate you agree to the [Black Forest Labs API agreement](https://docs.bfl.ml/agreement/) and the [Black Forest Labs Terms of Service](https://blackforestlabs.ai/terms-of-service/).

