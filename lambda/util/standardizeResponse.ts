
export default function standardizeResponse(provider: string, response: any) {
    if (provider === 'openai') {
        return {
            text: response.choices?.[0]?.message?.content || '',
            usage: response.usage,
        }
    } else if (provider === 'anthropic') {
        return {
            text: response.content?.[0]?.text || '',
            usage: response.usage,
        }
    } else {
        return {
            text: '',
            usage: {},
        }
    }
}