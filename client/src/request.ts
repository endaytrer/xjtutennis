const baseUrl = "/api"

interface StandardResponse {
    Success: boolean;
    Code:    number;
    Message: string;
    Data?:   any;
}
export class RequestErr extends Error {
    code:    number;
    message: string;
    constructor(code: number, message: string) {
        super();
        this.code = code;
        this.message = message
    }
}
export async function request(url: string, method: "GET" | "POST" | "PUT" | "DELETE", query?: Record<string, string> , data?: object): Promise<any> {
    let requestUrl = baseUrl + url;
    const headers = new Headers();
    let body: string | undefined;
    if (method == "GET" || method == "DELETE") {
        if (query !== undefined) {
            const params = new URLSearchParams(query)
            requestUrl += "?" + params.toString()
        }
    } else {
        if (data !== undefined) {
            headers.set("Content-Type", "application/json");
            body = JSON.stringify(data)
        }
    }
    
    const response = await fetch(requestUrl, {
        method,
        headers,
        body: body
    })
    const json: StandardResponse = await response.json()
    if (!json.Success) {
        throw new RequestErr(json.Code, json.Message)
    }
    return json.Data
}
