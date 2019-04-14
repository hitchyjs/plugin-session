/**
 * (c) 2018 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 cepharum GmbH
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

const Path = require( "path" );

const { describe, before, after, it } = require( "mocha" );
const HitchyDev = require( "hitchy-server-dev-tools" );

require( "should" );
require( "should-http" );


describe( "Hitchy instance with plugin for server-side sessions", () => {
	let server = null;
	let sid = null;

	before( "starting hitchy", () => {
		return HitchyDev.start( {
			extensionFolder: Path.resolve( __dirname, "../.." ),
			testProjectFolder: Path.resolve( __dirname, "../project" ),
		} )
			.then( s => {
				server = s;
			} );
	} );

	after( "stopping hitchy", () => {
		return server ? HitchyDev.stop( server ) : undefined;
	} );

	it( "is running", () => {
		return HitchyDev.query.get( "/" )
			.then( res => {
				res.should.have.status( 200 );
				res.should.have.contentType( "application/json" );
			} );
	} );

	it( "is returning cookie for selecting server-side session", () => {
		return HitchyDev.query.get( "/" )
			.then( res => {
				res.should.have.status( 200 );
				res.should.have.contentType( "application/json" );
				res.headers.should.have.property( "set-cookie" ).which.is.an.Array();

				res.headers["set-cookie"].some( cookie => {
					const match = /^\s*sessionid=([^;]+)/i.exec( cookie );
					if ( match ) {
						sid = match[1];
					}

					return Boolean( match );
				} );

				sid.should.be.String().which.is.not.empty();
			} );
	} );

	it( "is returning same cookie with different value on repeating query without providing recently returned cookie", () => {
		return HitchyDev.query.get( "/" )
			.then( res => {
				res.should.have.status( 200 );
				res.should.have.contentType( "application/json" );
				res.headers.should.have.property( "set-cookie" ).which.is.an.Array();

				let newSid;

				res.headers["set-cookie"].some( cookie => {
					const match = /^\s*sessionid=([^;]+)/i.exec( cookie );
					if ( match ) {
						newSid = match[1];
					}

					return Boolean( match );
				} );

				newSid.should.be.ok().and.be.String().which.is.not.equal( sid );
			} );
	} );

	it( "is returning some adjusted value of freshly initialized counter", () => {
		return HitchyDev.query.get( "/increase" )
			.then( res => {
				res.should.have.status( 200 );
				res.should.have.contentType( "application/json" );
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.ownProperty( "counter" ).which.is.a.Number().and.equal( 1 );
			} );
	} );

	it( "is returning same adjusted value of another freshly initialized counter due to starting another session on every request", () => {
		return HitchyDev.query.get( "/increase" )
			.then( res => {
				res.should.have.status( 200 );
				res.should.have.contentType( "application/json" );
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.ownProperty( "counter" ).which.is.a.Number().and.equal( 1 );
			} );
	} );

	it( "is returning same adjusted value of freshly initialized counter on selecting previously created session using cookie returned before", () => {
		sid.should.be.ok();

		return HitchyDev.query.get( "/increase", null, {
			cookie: `sessionId=${sid}`,
		} )
			.then( res => {
				res.should.have.status( 200 );
				res.should.have.contentType( "application/json" );
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.ownProperty( "counter" ).which.is.a.Number().and.equal( 1 );
			} );
	} );

	it( "is re-using previously fetched counter value due on selecting existing server-side session", () => {
		sid.should.be.ok();

		return HitchyDev.query.get( "/increase", null, {
			cookie: `sessionId=${sid}`,
		} )
			.then( res => {
				res.should.have.status( 200 );
				res.should.have.contentType( "application/json" );
				res.data.should.be.an.Object().which.has.size( 1 ).and.has.ownProperty( "counter" ).which.is.a.Number().and.equal( 2 );
			} );
	} );
} );
