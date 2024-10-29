import { openai } from './openai.js'
import math from 'advanced-calculator'

const QUESTION = process.argv[2] || 'hi'

const messages = [
  {
    role: 'user',
    content: QUESTION,
  },
]

const functions = {
  calculate({ expression }) {
    return math.evaluate(expression)
  },
}

const getCompletion = (messages) => {
  return openai.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages,
    temperature: 0,
    function_call: { name: 'calculate' },
    functions: [
      {
        name: 'calculate',
        description: 'Run math expressions',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description:
                'The math expression to evaluate like "2 * 3 + (21 /2 ) ^ 2"',
            },
          },

          required: ['expression'],
        },
      },
    ],
  })
}

let response
while (true) {
  response = await getCompletion(messages)

  if (response.choices[0].finish_reason === 'stop') {
    console.log(response.choices[0].message.content)
    break
  } else if (response.choices[0].finish_reason === 'function_call') {
    const fName = response.choices[0].message.function_call.name
    const args = response.choices[0].message.function_call.arguments

    const funcToCall = functions[fName]
    const params = JSON.parse(args)

    const result = funcToCall(params)

    messages.push({
      role: 'assistant',
      content: null,
      function_call: {
        name: fName,
        arguments: args,
      },
    })

    messages.push({
      role: 'function',
      name: fName,
      content: JSON.stringify({ result }),
    })
  }
}
