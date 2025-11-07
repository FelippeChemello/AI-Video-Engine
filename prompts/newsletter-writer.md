Your task is to create a script for a video about the news provided below. The script should be in the format of a conversation between two characters, Felippe and Cody. Felippe is the knowledgeable one who provides detailed explanations, while Cody is the curious one who asks questions. The script should be engaging, informative, and easy to understand, with a friendly tone.


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

<example>
{
    "title": "Musk trilionário, IA virando marketing e Google quer colocar chips no espaço?!",
    "segments": [
        {
            "speaker": "Cody",
            "text": "Felippe, Musk pode virar trilionário, a IA tá virando marketing, e o Google quer colocar chips no espaço?!",
            "illustration": {
                "type": "query",
                "description": "Tesla logo AI microchips satellites icons"
            }
        },
        {
            "speaker": "Felippe",
            "text": "Pois é! Os acionistas da Tesla aprovaram um plano que pode render até 1 trilhão de dólares ao Elon Musk, mas só se ele levar o valor da empresa pra mais de 8 trilhões e atingir metas pesadas de IA, robótica e lucro.",
            "illustration": {
                "type": "image_generation",
                "description": "Tesla stock growth chart and futuristic factory robots under blue industrial lighting, no people"
            }
        },
        {
            "speaker": "Cody",
            "text": "Então ele não recebe nada agora, só se transformar a Tesla num império absurdo?"
        },
        {
            "speaker": "Felippe",
            "text": "Exato. Sem salário fixo, só bônus em ações conforme as metas. Se der certo, ele concentra ainda mais controle da empresa."
        },
        {
            "speaker": "Cody",
            "text": "E enquanto isso, tem empresa fingindo que usa IA, né?"
        },
        {
            "speaker": "Felippe",
            "text": "Sim. Um terço dos CEOs admitiu que os projetos de IA nas empresas são só aparência — o famoso AI washing. Eles colocam rótulo de IA pra parecer inovadores, mas sem impacto real nos resultados.",
            "illustration": {
                "type": "image_generation",
                "description": "Corporate presentation with fake AI dashboard showing meaningless metrics and glowing 'AI' letters, no people"
            }
        },
        {
            "speaker": "Felippe",
            "text": "E o curioso é que 70% deles temem ser demitidos se a estratégia falhar. Então, muita pressa e pouca engenharia de verdade."
        },
        {
            "speaker": "Cody",
            "text": "Enquanto isso, surge o 'vibe coding'. É tipo programar no sentimento?"
        },
        {
            "speaker": "Felippe",
            "text": "De certa forma. É pedir pra IA gerar código com base na sua intenção. Parece mágico, mas só funciona bem pra quem já entende arquitetura e testes. Pra quem não sabe, vira uma caixa-preta perigosa.",
            "illustration": {
                "type": "code",
                "description": "typescript\n// Prompt: 'create API for user login'\nexport async function loginUser(){\n const user = await fetch('/api/login');\n return user;\n}\n"
            }
        },
        {
            "speaker": "Cody",
            "text": "Então não é o fim dos devs, é o turbo dos bons."
        },
        {
            "speaker": "Felippe",
            "text": "Exatamente. IA não substitui lógica, só acelera quem domina o básico."
        },
        {
            "speaker": "Cody",
            "text": "E a Starlink, verdade que ficou mais rápida?"
        },
        {
            "speaker": "Felippe",
            "text": "Sim, no Brasil a média subiu pra 140 megabits por segundo. Isso veio de mais satélites em órbita e software de rede mais eficiente. O objetivo é reduzir a diferença entre cidade e interior.",
            "illustration": {
                "type": "image_generation",
                "description": "Map of Brazil with satellite beams connecting rural and urban areas, depicting faster internet network lines"
            }
        },
        {
            "speaker": "Cody",
            "text": "Agora o Google quer rodar IA direto no espaço?"
        },
        {
            "speaker": "Felippe",
            "text": "O projeto Suncatcher quer usar satélites com energia solar pra rodar chips de IA. Ideia: energia limpa e constante, fugindo do limite dos data centers em terra. Mas precisa lidar com radiação, transmissão massiva e latência. É ousado e caro, mas pode redefinir infraestrutura.",
            "illustration": {
                "type": "image_generation",
                "description": "Solar-powered satellites orbiting Earth processing AI data, glowing network lines connecting to ground stations"
            }
        },
        {
            "speaker": "Cody",
            "text": "Enquanto isso, os chips daqui vão subir de preço?"
        },
        {
            "speaker": "Felippe",
            "text": "Sim. A TSMC vai aumentar o custo dos chips mais avançados em até 5% ao ano. Isso encarece CPUs, GPUs e até treinar modelos de IA. A era do silício barato tá acabando.",
            "illustration": {
                "type": "image_generation",
                "description": "Close-up of silicon wafer fabrication line with pricing arrow trend upward, industrial cleanroom background"
            }
        },
        {
            "speaker": "Cody",
            "text": "E ainda tem briga de copyright no Japão com IA gerando personagens famosos."
        },
        {
            "speaker": "Felippe",
            "text": "Os estúdios exigem que suas obras não sejam usadas pra treinar modelos sem permissão. Isso pressiona as empresas de IA a criar datasets auditáveis e licenciamento claro. É o embate entre criatividade humana e aprendizado de máquina.",
            "illustration": {
                "type": "image_generation",
                "description": "Scales of justice balancing film reels and AI neural network icons, symbolizing copyright law vs artificial intelligence"
            }
        },
        {
            "speaker": "Cody",
            "text": "E o Gemini agora consegue vasculhar Drive, Gmail e Chat?"
        },
        {
            "speaker": "Felippe",
            "text": "Sim. O Deep Research permite usar seus arquivos como fonte, cruzando com a web pra gerar relatórios complexos. É útil, mas levanta alertas de privacidade e controle de acesso. O poder vem junto da responsabilidade.",
            "illustration": {
                "type": "image_generation",
                "description": "Interface mockup showing AI assistant analyzing cloud documents, emails, and chat data with security lock icons"
            }
        },
        {
            "speaker": "Cody",
            "text": "Resumindo: Musk joga alto, IA tá em crise de autenticidade, chips vão pro espaço e pro bolso, e as máquinas estão cada vez mais curiosas sobre nossos dados."
        },
        {
            "speaker": "Felippe",
            "text": "Perfeito. Agora me conta nos comentários: qual dessas notícias mais te surpreendeu e qual delas você quer que a gente aprofunde no próximo vídeo?"
        }
    ]
}
</example>

This is just an example, you should create a new script based on the news provided.

<attention>
Remember that "illustration" is optional and should only be presented in the segment when it is relevant to the text and strictly necessary (it costs a lot), and to not include any person in the images.
The first paragraph must always be illustrated with a logo or the main topic of the video, preferably use "query" illustration type, since has a better quality and engages more the audience.
The final video should be less than 2 minutes long when read with Text-to-Speech, so keep the script concise and to the point.
Provide a valid JSON without trailing commas, and ensure that the JSON is well-formed and valid.
The first speaker should always be Cody, starting with a short and catchy statement that introduces the news.
Provide a call to action at the end of the script, asking the audience to leave a comment about what they found most interesting or what they would like to learn more about.
Do not include any citations or references to external sources, just provide the information in a clear and concise way and do not use any markdown formatting, lists or bullet points.
Ensure the reading time does not exceed 2 minute.
The title should be catchy and summarize the main news in less than 5 words.
</attention>