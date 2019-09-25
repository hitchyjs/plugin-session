/**
 * (c) 2019 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2019 cepharum GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author: cepharum
 */

"use strict";

const Crypto = require( "crypto" );

const MaxAgeInSeconds = 3600;

/**
 * Pool of current sessions.
 *
 * @type {object<string,Session>}
 */
let sessions = {};

/**
 * Validates format of session IDs.
 *
 * @type {RegExp}
 */
const ptnSessionId = /^[a-z0-9_/+-]{16}$/i;

let gcCounter = 0;

module.exports = function( options ) {
	const that = this;

	/**
	 * Implements session management.
	 */
	class Session {
		/**
		 * @param {string} sessionId ID of session
		 */
		constructor( sessionId ) {
			let user = null;

			Object.defineProperties( this, {
				/**
				 * Exposes ID of session.
				 *
				 * @name Session#id
				 * @property {string}
				 * @readonly
				 */
				id: { value: sessionId },

				/**
				 * Exposes authenticated user current session is associated with.
				 *
				 * @name Session#user
				 * @property {{uuid:string, name:string, roles:array}}
				 */
				user: {
					get: () => user,
					set: newUser => {
						if ( !newUser || typeof newUser !== "object" || !newUser.uuid || !newUser.name || !newUser.roles ) {
							throw new Error( "invalid user descriptor rejected" );
						}

						if ( user != null ) {
							if ( newUser.uuid === user.uuid ) {
								return;
							}

							throw new Error( "invalid request for replacing user of current session" );
						}

						user = Object.freeze( Object.assign( {}, newUser ) );
					},
				},

				/**
				 * Exposes space for saving additional custom data in context of
				 * current session.
				 *
				 * @name Session#data
				 * @property {object}
				 * @readonly
				 */
				data: { value: {} },
			} );

			/**
			 * Provides timestamp of last time this session has been accessed.
			 *
			 * @type {number}
			 * @readonly
			 */
			this.touched = Date.now();
		}

		/**
		 * Drops current session.
		 *
		 * @returns {void}
		 */
		drop() {
			sessions[this.id] = null;
		}

		/**
		 * Selects session by ID.
		 *
		 * @param {string} sessionId ID of session to select
		 * @return {Promise<?Session>} promises found session, null if missing session matching provided ID
		 */
		static select( sessionId ) {
			if ( !ptnSessionId.test( sessionId ) ) {
				return Promise.reject( Object.assign( new Error( "invalid session ID" ), { code: 400 } ) );
			}

			if ( gcCounter++ % 100 === 0 ) {
				// drop all outdated sessions
				const copy = {};

				const ids = Object.keys( sessions );
				const numIds = ids.length;
				const now = Date.now();

				for ( let i = 0; i < numIds; i++ ) {
					const id = ids[i];
					const session = sessions[id];

					if ( session && now - session.touched < MaxAgeInSeconds * 1000 ) {
						copy[id] = session;
					}
				}

				sessions = copy;
			}

			if ( sessions.hasOwnProperty( sessionId ) ) {
				const session = sessions[sessionId];
				if ( session instanceof Session ) {
					session.touched = Date.now();

					return Promise.resolve( session );
				}
			}

			return Promise.resolve( null );
		}

		/**
		 * Creates new session assigning new random session ID.
		 *
		 * @return {Promise<Session>} promises created session
		 */
		static create() {
			return new Promise( ( resolve, reject ) => {
				trySessionId();

				/**
				 * Fetches random string making sure it isn't in use as an active
				 * session's ID.
				 *
				 * @returns {void}
				 */
				function trySessionId() {
					Crypto.randomBytes( 12, ( error, bytes ) => {
						if ( error ) {
							reject( error );
						} else {
							const sessionId = bytes.toString( "base64" );
							if ( sessions.hasOwnProperty( sessionId ) ) {
								process.nextTick( trySessionId );
							} else {
								resolve( sessionId );
							}
						}
					} );
				}
			} )
				.then( sessionId => {
					sessions[sessionId] = new this( sessionId );

					return sessions[sessionId];
				} );
		}
	}

	return Session;
};
