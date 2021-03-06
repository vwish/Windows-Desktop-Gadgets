// Copyright (c) 2010, SoftLayer Technologies, Inc. All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//  * Redistributions of source code must retain the above copyright notice,
//    this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//  * Neither SoftLayer Technologies, Inc. nor the names of its contributors may
//    be used to endorse or promote products derived from this software without
//    specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

var userName = "SL#####";
var apiKey = "1234567890ABCDEF";
var pollFreq = "60";
var defaultPollTime = "10";
var pollTimer = null;
var pollCount = 0;
var ticketList = null;
var recentlyClosedTickets = new Array(10);
var rctIndex = 0;

// Before each API poll we need to load the latest and greatest credentials.
function refreshCredentials()
{
	var tmp = System.Gadget.Settings.readString("user_name");
	if (tmp != "") userName = tmp;
	tmp = System.Gadget.Settings.readString("api_key");
	if (tmp != "") apiKey = tmp;
	tmp = System.Gadget.Settings.readString("poll_freq");
	if (tmp != "") pollFreq = tmp;
}


// Initialize any msgs we want to display prior to first poll.
function initFadeMsgs() {
  fadeMsgs[0] = "";
}

// You can also play with these variables to control fade speed, fade color, and how fast the colors jump.
var fadeOutColor = 255;
var fadeInColor=0;
var fade = 0;
var fadeStep = 3;
var fadeWait = 1600;
var doFadeOut = true;
var fadeInterval;
var fadeTimer;
var fadeMsgs;
var msgCursor = 0;
var maxMsg;
var companyName = "test";

// Start the marquee
function Fadewl() {
  fadeInterval = setInterval(fadeOnTimer, 10);
  fadeMsgs = new Array();
  initFadeMsgs();
  maxMsg = fadeMsgs.length-1;
  setFadeMsg();
}

// Set the current msg in the marquee
function setFadeMsg() {
  var ilink = document.getElementById("fade_link");
  ilink.innerHTML = fadeMsgs[msgCursor];
}

// Timer callback for handling fades.
function fadeOnTimer() {
  if (doFadeOut) {
    fade+=fadeStep;
    if (fade>fadeOutColor) {
      msgCursor++;
	  if (msgCursor>maxMsg)
        msgCursor=0;
      setFadeMsg();
      doFadeOut = false;
    }
  } else {
    fade-=fadeStep;
    if (fade<fadeInColor) {
      clearInterval(fadeInterval);
      fadeTimer = setTimeout(resumeFade, fadeWait);
      doFadeOut=true;
    }
  }
  var ilink = document.getElementById("fade_link");
  if ((fade<fadeOutColor)&&(fade>fadeInColor))
    ilink.style.color = "#" + toHex(fade);
}

// Resume a previously interrupted fade.
function resumeFade() {
  fadeInterval = setInterval(fadeOnTimer, 10);
}


// Convert a base 10 number into a hex color value.
function toHex(strValue) {
  try {
    var result= (parseInt(strValue).toString(16));

    while (result.length !=2)
            result= ("0" +result);
    result = result + result + result;
    return result.toUpperCase();
  }
  catch(e)
  {
  }
}


// Loads main gadget form and initializes handlers for settings and flyouts.
function loadMain()
{
    // set appropriate size for docked state
    with(document.body.style)
        width=130,
        height=145;  
    
    // set correct background image    
    System.Gadget.background="url(images/background.png)";
    System.Gadget.settingsUI="settings.html";
    System.Gadget.Flyout.file ="flyout.html";
    System.Gadget.Flyout.onHide = hideFlyout;
    System.Gadget.Flyout.onShow = showFlyout;
    Fadewl();
	//poll();
	pollTimer = setTimeout(poll, defaultPollTime * 1000);
}

// Spawn the flyout page on a click.
function spawnFlyout()
{
	clearInterval(fadeInterval);
    clearTimeout(fadeTimer);
	setHiddenFields();
	System.Gadget.Flyout.show = true;
}

// Remove a msg from the marquee so it is no longer cycled.
function markAsRead(index)
{
	var i;
	if (index == 0) return;
	msgCursor = 0;
	fadeMsgs.splice(index,1);
	maxMsg = fadeMsgs.length-1;
}

// As rudimentry as it seems, using hidden fields on the parent
// page is the easiest and most reliable way to pass messages between
// the main UI element, and the flyout.
function setHiddenFields()
{
	var string = fadeMsgs[msgCursor];
	var split = string.split("#");
	var ticket = null;
	if (split.length == 2) ticket = findTicketById(split[1]);
	if (ticket != null)
	{
		element = document.getElementById("company_name");
		element.value = companyName;
		element = document.getElementById("modify_date");
		element.value = ticket.modifyDate;
		element = document.getElementById("ticket_title");
		element.value = ticket.title;
		element = document.getElementById("ticket_id");
		element.value = ticket.id;
		element = document.getElementById("resource_provider");
		element.value = ticket.serviceProviderId;
		markAsRead(msgCursor);
	}
	else
	{
		element = document.getElementById("company_name");
		if (ticketList!=null)
		{
			element.value = "Currently "+ticketList.length+" open tickets.";
		}
		else 
		{
			element.value = "Currently ?? open tickets.";
		}
		element = document.getElementById("modify_date");
		element.value = " ";
		element = document.getElementById("ticket_title");
		element.value = " ";
		element = document.getElementById("ticket_id");
		element.value = " ";
		element = document.getElementById("resource_provider");
		element.value = " ";
	}
}


// Callback when the flyout shows.
function showFlyout()
{
    //required handler even if it is empty
}

// Search for a ticket by ID, in both the current list and the 
// recently closed ticket list.
function findTicketById(id)
{
	var i;
	for (i = 0; i < ticketList.length; i++)
	{
		if (ticketList[i].id == id) return ticketList[i];
	}
	for (i=0; i< rctIndex; i++)
	{
		if (recentlyClosedTickets[i].id == id) return recentlyClosedTickets[i];
	}
	return null;
}

// Hide the flyout from the user / resume marquee
function hideFlyout()
{
    clearInterval(fadeInterval);
	fadeInterval = setInterval(fadeOnTimer, 10);
}

// Poll the SoftLayer API for an update containing the latest ticket info.
function poll()
{
	clearTimeout(pollTimer);
	refreshCredentials();
	try {
		var result = parseInt(pollFreq);
		pollTimer = setTimeout(poll, result * 1000);
	} catch (e) {
		pollTimer = setTimeout(poll, defaultPollTime * 1000);
	}
	pollCount++;
	updateTicketData();
	try {
	} catch (e) {
		marqueeAlert("Error!",e.message);
	}
}

// This is the main function for:
//
// 1.) composing the request
// 2.) handlimg api callback results object
// 3.) handling a failure callback from the API.
// 4.) executing the latest request
//
function updateTicketData()
{
	
	var apiRequest = new SLAPIRequest( userName, apiKey, "SoftLayer_Account","getObject.json", null);
	
	apiRequest.objectMask = "openTickets";
    
	apiRequest.successCallback = function (httpRequest, jsonObject) 
								 {
									var element = null;
									var ticketCountNow = 0;
									var ticketListNow = null;
									if (jsonObject.openTickets != null)	ticketCountNow = jsonObject.openTickets.length;
									if (jsonObject.openTickets != null) ticketListNow = jsonObject.openTickets;
									companyName = jsonObject.companyName;
									element = document.getElementById("softlayer_ticket_cnt");
									element.innerHTML = ticketCountNow;
									element = document.getElementById("softlayer_account_id");
									element.innerHTML = jsonObject.id;
									compareLists(ticketListNow);
								 };

    apiRequest.failureCallback = function (httpRequest, jsonObject, e) 
								 {    
									if (e.message == "The server reported an internal error")
									{
										marqueeAlert("SLAPI Request Failed", "Check your credentials.");
									}
									else
									{
										marqueeAlert("SLAPI Request Failed", e.message);
									}
								 };

    apiRequest.execute();

}

// Used to compare the "last" list of tickets and updates with the "current" list.
function compareLists(ticketListNow)
{
	var now = new Date();
	var month = now.getMonth() + 1;
	var day = now.getDate();
	var year = now.getFullYear();
	var hours = now.getHours();
	var minutes = now.getMinutes();
	var i;
	var j;
	if (minutes < 10)
	{
		minutes = "0" + minutes
	}
	var tod = "AM";
	if(hours > 11)
	{
		tod ="PM";
	}
	if (ticketList == null)
	{
		clearMessageQueue();
		updateMessageQueue(0, "Initialized "+hours + ":" + minutes + " " + tod);
	}
	else
	{
		updateMessageQueue(0, "Refreshed "+hours + ":" + minutes + " " + tod);
		var id;
		
		// check for new tickets
		for (i = 0; i < ticketListNow.length; i++)
		{
			var opened = true;
			id = ticketListNow[i].id;
			for (j = 0; j< ticketList.length; j++)
			{
				if (ticketListNow[i].id == ticketList[j].id) 
				{
					opened = false;
					break;
				}
			}
			if (opened) addOpenTicketMessage(id);
		}
		//check for closed tickets
		for (i = 0; i < ticketList.length; i++)
		{
			var closed = true;
			id = ticketList[i].id;
			for (j = 0; j< ticketListNow.length; j++)
			{
				if (ticketListNow[j].id == ticketList[i].id) 
				{
					closed = false;
					break;
				}
			}
			if (closed) addCloseTicketMessage(id);
		}
		//check for updated tickets
		for (i = 0; i < ticketList.length; i++)
		{
			var updated = false;
			id = ticketList[i].id;
			for (j = 0; j< ticketListNow.length; j++)
			{
				if (ticketListNow[j].id == ticketList[i].id) 
				{
					if (ticketListNow[j].modifyDate != ticketList[i].modifyDate)
					{
						if (ticketListNow[j].lastEditType == "EMPLOYEE")
						{
							updated = true;
							break;
						}
					}
				}
			}
			if (updated) addUpdateTicketMessage(id);
		}
	}
	ticketList = ticketListNow;
}

// Add a message to the marquee that
// a new ticket has been opened.
function addOpenTicketMessage(id)
{
	var i;
	for (i = 0; i <= maxMsg; i++)
	{
		if (fadeMsgs[i] == ("Opened #"+id)) return;
	}
	clearInterval(fadeInterval);
    clearTimeout(fadeTimer);
	fadeMsgs[maxMsg+1] = ("Opened #"+id);
	maxMsg = fadeMsgs.length-1;
	msgCursor=0;
	setFadeMsg();
	fadeInterval = setInterval(fadeOnTimer, 10);
}

// Add a message to the marquee that
// a ticket has been closed.
function addCloseTicketMessage(id)
{
	var i;
	for (i = 0; i <= maxMsg; i++)
	{
		if (fadeMsgs[i] == ("Closed #"+id)) return;
	}
	clearInterval(fadeInterval);
    clearTimeout(fadeTimer);
	fadeMsgs[maxMsg+1] = ("Closed #"+id);
	maxMsg = fadeMsgs.length-1;
	msgCursor=0;
	setFadeMsg();
	var ticket = findTicketById(id);
	var add_to_recently_closed = true;
	for (i=0; i < rctIndex; i++)
	{
		if (recentlyClosedTickets[i].id == id) 
		{
			add_to_recently_closed = false;
			break;
		}
	}
	if (add_to_recently_closed)
	{
		if (rctIndex+1 > 10)
		{
			for (i=0; i<9; i++)
			{
				recentlyClosedTickets[i] = recentlyClosedTickets[i+1]; 
			}
			rctIndex--;
		}
		recentlyClosedTickets[rctIndex] = ticket;
		rctIndex++;
	}
	fadeInterval = setInterval(fadeOnTimer, 10);
}

// Add a message to the marquee that a ticket
// was updated/
function addUpdateTicketMessage(id)
{
	var i;
	for (i = 0; i <= maxMsg; i++)
	{
		if (fadeMsgs[i] == ("Updated #"+id)) return;
	}
	clearInterval(fadeInterval);
    clearTimeout(fadeTimer);
	fadeMsgs[maxMsg+1] = ("Updated #"+id);
	maxMsg = fadeMsgs.length-1;
	msgCursor=0;
	setFadeMsg();
	fadeInterval = setInterval(fadeOnTimer, 10);
}

// Add a new message to the marquee.
// Requires stopping and restarting the timers.
function updateMessageQueue(index, msg, link)
{
	clearInterval(fadeInterval);
    clearTimeout(fadeTimer);
	fadeMsgs[index] = msg;
	maxMsg = fadeMsgs.length-1;
	msgCursor=0;
	setFadeMsg();
	fadeInterval = setInterval(fadeOnTimer, 10);
}

// Clear all messages from the marquee.
function clearMessageQueue()
{
	clearInterval(fadeInterval);
    clearTimeout(fadeTimer);
	fadeMsgs = [];
	maxMsg = 0;
	msgCursor=0;
	setFadeMsg();
	fadeInterval = setInterval(fadeOnTimer, 10);
}

// Uset this function to display an error message
// to the user via the marquee.
function marqueeAlert(msg1, msg2)
{
	clearInterval(fadeInterval);
    clearTimeout(fadeTimer);
	fadeMsgs = [];
	fadeMsgs[0] = msg1;
	fadeMsgs[1] = msg2;
	maxMsg = fadeMsgs.length-1;
	msgCursor=0;
	setFadeMsg();
	fadeInterval = setInterval(fadeOnTimer, 10);
}

