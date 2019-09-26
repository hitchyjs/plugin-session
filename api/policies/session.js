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

exports.inject = function( req, res, next ) {
	const { Session } = this.services;
	const log = this.api.log( "hitchy:session" );

	if ( req.session ) {
		// if there is a session in request it might be a flaw ...
		log( "ERROR: got unexpected request with session injected" );

		next( Object.assign( new Error( "unexpected session in request" ), { code: 400 } ) );
	} else {
		log( `DEBUG: handling session injection with for cookie-based session ID: ${req.cookies.sessionId}` );

		Promise.resolve( req.cookies.sessionId )
			.then( sessionId => ( sessionId ? Session.select( sessionId ) : null ) )
			.then( session => {
				if ( session ) {
					log( `DEBUG: session found for session ID: ${req.cookies.sessionId}` );

					return session;
				}

				log( `DEBUG: creating new session for session ID: ${req.cookies.sessionId}` );

				return Session.create()
					.then( newSession => {
						res.set( "Set-Cookie", `sessionId=${newSession.id}; Path=/` );

						return newSession;
					} );
			} )
			.then( session => {
				Object.defineProperties( req, {
					session: { value: new Proxy( session, {
						get( target, p ) {
							switch ( p ) {
								case "id" :
								case "user" :
								case "data" :
								case "touched" :
									return target[p];

								default :
									return target.data[p];
							}
						},
						set( target, p, value ) {
							switch ( p ) {
								case "id" :
								case "user" :
								case "data" :
									target[p] = value;
									return true;

								case "touched" :
									return false;

								default :
									target.data[p] = value;
									return true;
							}
						},
					} ) },
				} );

				res.set( "X-Have-Session", "true" );

				if ( session.user ) {
					const { name, roles } = session.user;

					log( `DEBUG: exposing session user ${name} with roles ${roles.join( "," )}` );

					res.set( "X-Authenticated-As", name );
					res.set( "X-Authorized-As", roles.join( "," ) );
				}

				next();
			} )
			.catch( error => {
				log( `ERROR: on handling session injection: ${error.message}` );

				next( error );
			} );
	}
};
