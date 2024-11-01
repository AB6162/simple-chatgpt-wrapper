# simple-chatgpt-wrapper
 A simple npm package to perform requests automatically as a user on the ChatGPT OpenAI page.

## Install

### Package managers

npm: `npm i @ab6162/simple-chatgpt-wrapper`

## Usage

Using this package is so easy, just pass it the user credentials you use in the OpenAI ChatGPT platform and the magic will happen.

This is a fully functional initial version for those who want to connect some kind of service in NodeJS. It's recommended to keep the timeouts as they're to avoid possible bans.

This package doesn't collect any kind of data, which you can see in the source code published in [GitHub](https://github.com/ab6162/simple-chatgpt-wrapper)

This is an example code for use:

``` javascript
const chatgpt = require('@ab6162/simple-chatgpt-wrapper');

(async () => {

    //user and password here
    const statusLogin = await chatgpt.login('example@example.com', 'xxxx');

    //verify that the answer is not null
    if (statusLogin) {

        //send a request and wait the response in raw format.
        var response = await chatgpt.sendMessage('¿Hello, how are you?');

        console.log(response);

        response = await chatgpt.sendMessage('Give me five names...');

        console.log(response);

    } else {
        console.log('Login failed!');
    }

})();
```

## Issues

If there are any bugs or questions open a new issue

## License

MIT

