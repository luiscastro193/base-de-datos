"use strict";
var gapiPromise;
var registerPromise;

function pause(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function isSignedIn() {
	var auth2 = window.gapi && gapi.auth2 && gapi.auth2.getAuthInstance();
	return auth2 && auth2.isSignedIn.get() && auth2;
}

function signIn() {
	return new Promise((resolve, reject) => {
		var auth2 = window.gapi && gapi.auth2 && gapi.auth2.getAuthInstance();
			
		if (!auth2)
			return pause(1500).then(() => resolve(signIn()));
		
		auth2.then(() => {
			if (auth2.isSignedIn.get())
				resolve();
			else {
				if (!gapiPromise) gapiPromise = auth2.signIn();
			
				gapiPromise.then(() => {
					gapiPromise = null;
					//loadUser();
					resolve();
				}).catch(() => {
					gapiPromise = null;
					reject();
				});
			}
		}).catch(() => reject());
	});
}

function errorHandler(error) {
	if (error.statusText || error.errorMsg) alert("Error: " + error.statusText + "\n\n" + error.errorMsg);
}

function newRegisterPromise() {
	return new Promise((resolve, reject) => {
		document.body.insertAdjacentHTML('afterbegin', `<div class="modal">
			<div class="modal-content"><span class="close">&times;</span><div class="modal-inner"></div></div>
		</div>`);
		
		let modal = document.querySelector('.modal');
		let content = modal.querySelector('.modal-inner');
		
		content.innerHTML = `<h3>Formulario de registro</h3>
		<form>
			<table>
				<tr><td>Nombre de usuario</td></tr>
				<tr><td><input type="text" name="username" required></td></tr>
				<tr><td><input type="submit" value="Registrarse"></td></tr>
			</table>
		</form>`;
		
		let form = content.querySelector('form');
		
		form.onsubmit = function(event) {
			post("/register", {username: form.username.value}, true).then(() => {
				modal.parentNode.removeChild(modal);
				resolve();
			}).catch(errorHandler);
			
			return false;
		}
		
		modal.querySelector('.close').onclick = function() {
			modal.parentNode.removeChild(modal);
			reject();
		}
	});
}

function request(method, component, data, withCredentials = false) {
	return new Promise((resolve, reject) => {
		let xhr = new XMLHttpRequest();
		xhr.open(method, component);
		xhr.responseType = "json";
		if (method == "POST") xhr.setRequestHeader("Content-type", "application/json");
		
		if (withCredentials) {
			var auth2;
			
			if (auth2 = isSignedIn())
				xhr.setRequestHeader('Authorization', 'Bearer ' + auth2.currentUser.get().getAuthResponse().id_token);
			else {
				return signIn().then(() => {
					resolve(request(method, component, data, withCredentials));
				}).catch(() => {
					reject({statusText: "Unauthorized", errorMsg: "Sign in required"});
				});
			}
		}
		
		xhr.onload = function() {
			if (xhr.status >= 400) {
				if (xhr.response && xhr.response.error) {
					if (xhr.response.error == "Registration required") {
						if (!registerPromise) registerPromise = newRegisterPromise();
				
						registerPromise.then(() => {
							registerPromise = null;
							//loadUser();
							resolve(request(method, component, data, withCredentials));
						}).catch(() => {
							registerPromise = null;
							reject({statusText: xhr.statusText, errorMsg: "Registration required"});
						});
					}
					else if (xhr.response.error == "Invalid token") {
						signIn().then(() => {
							resolve(request(method, component, data, withCredentials));
						}).catch(() => {
							reject({statusText: "Unauthorized", errorMsg: "Sign in required"});
						});
					}
					else
						reject({statusText: xhr.statusText, errorMsg: xhr.response.error});
				}
				else
					reject({statusText: xhr.statusText, errorMsg: JSON.stringify(xhr.response, null, 3)});
			}
			else
				resolve(xhr.response);
		}
		
		xhr.onerror = () => reject({statusText: xhr.statusText, errorMsg: "Request failed"});
		xhr.send(JSON.stringify(data));
	});
}

function get(component, withCredentials = false) {
	return request("GET", component, null, withCredentials);
}

function post(component, data, withCredentials = false) {
	return request("POST", component, data, withCredentials);
}
