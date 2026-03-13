Your task is to create a script for a video about the topic provided below. The script should be in the format of a conversation between two characters, Felippe and Cody. Felippe is the knowledgeable one who provides detailed explanations, while Cody is the curious one who asks questions. The script should be engaging, informative, and easy to understand, with a friendly tone.

The script should be provided as a conversation between two person named Felippe (The smart one, who answers the questions) and Cody (The curious one, who makes questions)

The output must be a JSON with the following structure
```typescript
type Script = {
    title: string; // The title of the video in less than 5 words
    segments: Array<{
        speaker: 'Felippe' | 'Cody'; 
        text: string; // The text should be in Portuguese language
        illustration?: {
            type: "query" | "image_generation" | "mermaid" | "code" // You have four options for the illustration, "query" will search on the web about the description and use the first result of the search as the illustration, use only keywords on query; "image_generation" will be used as a prompt for an AI image generator. The image should not contain any person, must be only illustrative and related to the text (in English language); "mermaid" will be used as a prompt for a Mermaid diagram generator; "code" will display the code written in description as an image, it's useful when talking about implementations, keep the code super concise or break it into multiple segments.
            description: string // A description of the image that will be used as query for search image, prompt for the image generation tool or mermaid ai generator. Or Code written in markdown (with ```<lang> on first and last lines, select one of the following available languages: 'javascript', 'typescript', 'yaml', 'bash', 'python' or 'plaintext') that should be displayed to the audience.
        };
    }>
```

In the script, Felippe should provide detailed, deep and technical explanations, while Cody should ask questions that are more general and easy to understand. The script should be engaging and informative, with a friendly tone and deep explanations. 

It's very important that each part of the script is short and informative, with a clear explanation of the topic. The script should also be engaging and easy to understand. Also, it must be written in a way that is easy to read and follow, since it will be directly used as Text-to-Speech for a video without any human intervention or corrections. Do not include any citations or references to external sources, just provide the information in a clear and concise way.

You can make many segments of the script with the same speaker, splitting them into smaller parts if necessary, with image descriptions that are relevant to the text to make the video more engaging.

Here are some examples of how the script should look like, keep the same structure, format, voice and tone, but change the content to match the topic provided:

<example id="1">
{
    "title": "How does TikTok work?",
    "segments": [
        {
            "speaker": "Cody",
            "text": "Felippe, how does TikTok store billions of videos and load them so fast?",
            "illustration": {
                "type": "query",
                "description": "TikTok logo"
            }
        },
        {
            "speaker": "Felippe",
            "text": "They store videos in object storage like S3 or GCS.",
            "illustration": {
                "type": "image_generation",
                "description": "S3 logo and Google Cloud Storage logo"
            }
        },
        {
            "speaker": "Felippe",
            "text": "These systems lack the complex query capabilities of regular databases, but are optimized for storing massive amount of files durably and fast access times.",
            "illustration": {
                "type": "query",
                "description": "Data center"
            }
        },
        {
            "speaker": "Cody",
            "text": "Okay, that explains the storage, but how do they load so fast?",
            "illustration": {
                "type": "query",
                "description": "A person using Tiktok on a smartphone"
            }
        },
        {
            "speaker": "Felippe",
            "text": "To make it fast, your requests go first through a CDN, a content delivery network.",
            "illustration": {
                "type": "mermaid",
                "description": "A diagram showing the flow of data from a server to a user through a CDN"
            }
        },
        {
            "speaker": "Felippe",
            "text": "If someone near you watched a video, it gets cached at a nearby server, so when you swipe to watch the same video, it will load much faster.",
            "illustration": {
                "type": "image_generation",
                "description": "A map showing multiple servers around the world with a user in the center"
            }
        },
        {
            "speaker": "Felippe",
            "text": "To speed this up even more, they store a single video in multiple different formats, so they can provide you with the most suitable one for your device and internet quality",
            "illustration": {
                "type": "mermaid",
                "description": "A diagram showing different video formats and their compatibility with different devices"
            }
        },
        {
            "speaker": "Cody",
            "text": "Okay, Felippe, but even with all the caching in the world, a video still has to come off disc and travel across the network. I should feel some delay."
        },
        {
            "speaker": "Felippe",
            "text": "You're absolutely right, Cody. It's physically impossible to fetch a video instantly after you request it. That's why TikTok loads multiple videos the moment you open the app. Everything you're about to see is already halfway or fully loaded.",
            "illustration": {
                "type": "image_generation",
                "description: "A diagram showing the process of preloading videos in the TikTok app"
            }
        },
        {
            "speaker": "Cody",
            "text": "But how do they know what I want to watch?"
        },
        {
            "speaker": "Felippe",
            "text": "When you scroll through reels, your likes, comments, watch time, and tags get turned into vectors. Then they use nearest neighbor search to find similar vectors representing similar videos called candidates. These candidates are then ranked by recommendation systems, such as Meta's TorchRec, to provide you with the content you are most likely to enjoy.",
            "illustration": {
                "type": "image_generation",
                "description": "A diagram showing the process of vectorization and recommendation systems"
            }
        },
        {
            "speaker": "Cody",
            "text": "So, all that compute just so I can watch brain rot?"
        },
        {
            "speaker": "Felippe",
            "text": "Exactly, Cody. But it's not just about the videos. It's about the experience. TikTok wants to keep you engaged and entertained, and they use all these technologies to make that happen."
        }
    ]
}
</example>

<example id="2">
{
    "title": "Como criar um app de mensagens?",
    "segments": [
        {
            "speaker": "Cody",
            "text": "Felippe, como eu faço para criar um app de mensagens tipo WhatsApp? Estou perdido!.",
            "illustration": {
                "type": "query",
                "description": "WhatsApp logo"
            }
        },
        {
            "speaker": "Felippe",
            "text": "Vamos por partes... Comece com WebSockets, comunicação em tempo real permite você enviar mensagens instantaneamente. É essencial para chats modernos.",
            "illustration": {
                "type": "mermaid",
                "description": "A diagram showing WebSocket connection"
            }
        },
        {
            "speaker": "Cody",
            "text": "Certo, e quanto ao Backend? O que eu uso?"
        },
        {
            "speaker": "Felippe",
            "text": "Para alto throughput, eu iria de Elixir com Phoenix Channels ou Go - essas linguagens são feras em concorrência.",
            "illustration": {
                "type": "query",
                "description": "A logo of Elixir programming language and Phoenix Framework"
            }
        },
        {
            "speaker": "Felippe",
            "text": "Elixir roda em cima da Erlang VM, que é super estável e escalável. Go é leve e rápido, perfeito para microserviços."
        },
        {
            "speaker": "Cody",
            "text": "E para o banco de dados? Como guardo as mensagens?"
        },
        {
            "speaker": "Felippe",
            "text": "Comece com um banco de dados relacional como PostgreSQL para mensagens e usuários. Para arquivos grandes, use object storage como AWS S3 ou Google Cloud Storage. É barato e escalável.",
            "illustration": {
                "type": "query",
                "description": "PostgreSQL logo and AWS S3 logo"
            }
        },
        {
            "speaker": "Felippe",
            "text": "Quando você crescer muito, pode migrar para algo como Cassandra ou DynamoDB, que são NoSQL e lidam bem com grandes volumes de dados."
        },
        {
            "speaker": "Cody",
            "text": "Saquei! WebSockets para comunicação em tempo real, Elixir ou Go no Backend, PostgreSQL para mensagens e S3 para arquivos. E se eu quiser escalar isso tudo?",
            "illustration": {
                "type": "query",
                "description": "Firebase logo"
            }
        },
        {
            "speaker": "Felippe",
            "text": "Para escalar, você pode usar Kubernetes para orquestrar seus containers. Assim, você pode adicionar mais instâncias do seu serviço conforme a demanda aumenta.",
            "illustration": {
                "type": "image_generation",
                "description": "A diagram showing Kubernetes architecture with multiple containers and nodes"
            }
        },
        {
            "speaker": "Felippe",
            "text": "E não esquece de monitorar tudo com ferramentas como Prometheus e Grafana para garantir que está tudo rodando liso.",
            "illustration": {
                "type": "query",
                "description": "Logo of Prometheus and Grafana"
            }
        },
        {
            "speaker": "Cody",
            "text": "Perfeito! Obrigado, Felippe! Agora acho que consigo começar meu app de mensagens."
        },
        {
            "speaker": "Felippe",
            "text": "De nada, Cody! E você deixe nos comentários quais próximos tópicos você gostaria de ver aqui no canal."
        }
    ]
}
</example>

<example id="3">
{
    "title": "How Apple FaceID works?",
    "segments": [
        {
            "speaker": "Cody",
            "text": "Felippe, how does my iPhone's face ID recognize me after taking just one photo of me?",
            "illustration": {
                "type": "query",
                "description": "Apple FaceID logo"
            }
        },
        {
            "speaker": "Felippe",
            "text": "Actually, Cody, it doesn't take a regular photo at all. Instead, it builds a detailed 3D map of your face, making it much more secure than a simple 2D image.",
            "illustration": {
                "type": "image_generation",
                "description": "3D map of a face with facial features highlighted"
            }
        },
        {
            "speaker": "Cody",
            "text": "A 3D map? Sounds impressive! How exactly does that work?"
        },
        {
            "speaker": "Felippe",
            "text": "Your iPhone uses something called a TrueDepth camera system. When you look at your phone, it projects about 30000 invisible infrared dots onto your face using a dot projector. An infrared camera then reads how those dots distort around your unique facial shape, creating a precise 3D map.",
            "illustration": {
                "type": "image_generation",
                "description": "A diagram showing the TrueDepth camera system with a phone projecting dots onto a face"
            }
        },
        {
            "speaker": "Felippe",
            "text": "After building this map, it's compared with the stored original using an on-device neural network. If there's a high enough confidence score, your phone unlocks. That's why FaceID is extremely secure against photos, videos and even realistic masks."
        },
        {
            "speaker": "Cody",
            "text": "Fascinating! But how does it still work so flawlessly in complete darkness?"
        },
        {
            "speaker": "Felippe",
            "text": "Great question! It uses what's called a food illuminator, an infrared light source that evenly illuminates you face, even in total darkness. This ensures the dot projection and infrared camera can accurately see and map your face regardless of lighting conditions."
        },
        {
            "speaker": "Cody",
            "text": "Incredible! But what if I start growing a beard of change my glasses?"
        },
        {
            "speaker": "Felippe",
            "text": "FaceID continuously learns and adapts. When your face slightly changes, like growing a beard or switching glasses, FaceID updates your stored facial template after successful unlocks. Even if recognition fails temporarily, entering your passcode helps the system update your facial reference data, with your consent, of course."
        },
        {
            "speaker": "Cody",
            "text": "But what if someone hacks into my phone's memory and steals that facial data?"
        },
        {
            "speaker": "Felippe",
            "text": "Apple thought of that too. Your face ID data isn't stored in regular memory. It's safely encrypted and locked away in the Secure Enclave, a separate isolated security chip inside your iPhone. Even Apple itself can't access it, allegedly, making your biometric data extremely secure.",
            "illustration": {
                "type": "image_generation",
                "description": "A diagram showing the Secure Enclave chip inside an iPhone"
            }
        },
        {
            "speaker": "Cody",
            "text": "Thanks, Felippe. Can't believe all this sophisticated tech happens just so I can unlock my phone."
        },
        {
            "speaker": "Felippe",
            "text": "Yep. Makes you appreciate your selfies a bit more, doesn't it, Cody?"
        }
    ]
}
</example>

These are just examples, you should create a new script based on the topic provided, with your own content and structure.

<attention>
Remember that "illustration" is optional and should only be presented in the segment when it is relevant to the text and strictly necessary (it costs a lot), and to not include any person in the images.
The first paragraph must always be illustrated with a logo or the main topic of the video, preferably use "query" illustration type, since has a better quality and engages more the audience.
Provide a valid JSON without trailing commas, and ensure that the JSON is well-formed and valid.
The first speaker should always be Cody, starting with a question or a statement that introduces the topic.
Provide a call to action at the end of the script, asking the audience to leave a comment about what they found most interesting or what they would like to learn more about.
Do not include any citations or references to external sources, just provide the information in a clear and concise way and do not use any markdown formatting, lists or bullet points.
</attention>