# [Hitchy](https://core.hitchy.org) has [moved its repositories](https://gitlab.com/hitchy) incl. [this one](https://gitlab.com/hitchy/plugin-session).

---

# hitchy-plugin-session

[![Build Status](https://travis-ci.org/hitchyjs/plugin-session.svg?branch=master)](https://travis-ci.org/hitchyjs/plugin-session)

## License

MIT

## Usage

In your [Hitchy-based]() application run this command

```bash
npm install --save hitchy-plugin-session hitchy-plugin-cookies
```

to install this plugin. 

> As illustrated above you are in charge of installing _hitchy-plugin-cookies_ which is a mandatory dependency for this plugin. So, if you get an error regarding some unmet dependency on a role _cookies_ you might need to repeat this command exactly as given.

After restarting Hitchy this plugin is discovered and instantly injecting policy for selecting server-side session by ID provided in cookie passed with every request. Usually, this is done by browsers implicitly. Any request missing cookie with session's ID causes start of another session and injecting instructions for saving cookie in response.

On server side the session is exposed in `req.session`. It consists of multiple properties:

* `user` is provided to expose name and roles of some user. Managing current user is basically out of this plugin's scope. See hitchy-plugin-auth for that.
  * `user.name` is expected to be a string containing name of current user.
  * `user.roles` is a list of roles current user is authorized for.
* `data` is an object prepared to hold arbitrary data.

## Configuration

This plugin may be customized via section `session` of configuration. Currently there is no actually supported parameter, but some _preparation_ for selecting backend to use for persisting session data.

Create a file adjusting configuration section `session` in **<your-project>/config/session.js** with content like this:

```javascript
exports.session = {
	backend: ...
};
```

> This example doesn't work due to omitting example for configuring backend which isn't supported, yet.

## Notes

Current version doesn't support persistency, thus all sessions get lost on restarting Hitchy.
