const extensionId = 'extension-labelmaker-id'.split('-')[1]; // this format is needed to set the Extension ID during install
const instance = easyeda.extension.instances[extensionId];
const manifest = instance.manifest;
const Helper = instance.Helper; // Helper class declared in easyeda-helper.js
const createCommand = Helper.createCommand;
const setConfig = Helper.setConfig;
const getConfig = Helper.getConfig;
const paper = instance.paper;
var opentypeFontCache = new Array();

var cmdVisitGithub = createCommand(()=>{ window.open(manifest.homepage,'_blank'); });

api('createToolbarButton', {
	fordoctype: 'pcb,pcblib',
	menu:[
		{
			text: "Create Label",
			cmd: createCommand(()=>{ labeldlg.dialog('open'); labeldlg.dialog('expand'); reloadFontList(); previewLabel(); }),
			title: 'Open Dialog for Label Maker',
		},
		{},
		{
			text: "Manage Fonts",
			cmd: createCommand(()=>{ labeldlg.dialog('close'); api('doCommand','fontsManagement'); }),
			title: 'Manage Fonts',
		},
		{
			text: "Rebuild Fonts Cache",
			cmd: createCommand(()=>{ labeldlg.dialog('close'); updateFontsCache(); }),
			title: 'Rebuild the Fonts Cache - required after adding Fonts to EasyEDA',
		},
		{},
		{
			text: "Visit GitHub Page",
			cmd: cmdVisitGithub,
			icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAFxSURBVHjajNPNK0RhFMfxe2dI04y8NExNNmzJ2igRWwtlRRllryz8DVhYiKLZaHbyWv4ALyHCgvwBQyEW5GVhphDfU7+rJ0n31Gfufe4959w7z3MfP1VX7/2KLgygHQ26doNDLGHXTfadBjWYxoj3fyxiHE82iDjFGyGKPeVsqMaLJuJxOy6gD0eYQhJVuMIjKnCOSdSiAylslvHTiWF1v8C8XrMaz7oenJfQioxq8tYga3OhxJJzvHde2z0PcqwmG1E3izfkQsxBTrkWGWuQ1uABhRANCsq1SFuDLw0SiIVoEFOuxZc1uNbAZrcnRIPuYAmt1hocaPCKGS2R/0ehr3vTzv19a5DXYBlb2MMx2pxim+ht7KBR1z6CZTzBHEbRi0s049Zp8KI94obVnAZ7wSZmBS0YU/EZPpWc1OxXaryOIRSDvVBEP9awqr+QdJ4WVbHlTWBQ5z97wdPTbKveaWnXna+uHE167Vm8B0XfAgwAj8RQQEL6HPwAAAAASUVORK5CYII="
		},
		{
			text: "About", 
			cmd: createCommand(()=>{ aboutdlg.dialog('open') })
		},
	]
});

var aboutdlg = api('createDialog', {
	title: `${manifest.name} - About`,
    content : `
    <div style="padding: 8px; text-align: center">
        <h1>${manifest.name}</h1>
		<h2>Version: ${manifest.version}</h2>
		<p>The Extension is inspired by the <a href="https://github.com/sparkfunX/Buzzard" target="_blank">SparkFun Buzzard Label Generator</a> 
			and I blame <a href="https://twitter.com/arturo182/status/1348415792254169089" target="_blank">@arturo182</a> and 
			<a href="https://twitter.com/GregDavill/status/1348957557503578113" target="_blank">@GregDavill</a> for
			getting me started on this ❤ </p>
		<p>The labels are generated with <a href="https://opentype.js.org/" target="_blank">opentype.js</a> (which can create text as SVG paths from any given font) and 
		<a href="http://paperjs.org/" target="_blank">paper.js</a> (which creates the surrounding shape and cleans up the SVG path)</p>
		<p>Follow me on <a href="https://twitter.com/Fruchti" target="_blank">Twitter</a></p>
        <p>Visit <a href="${manifest.homepage}" target="_blank">${manifest.homepage}</a> for updates</p>
    </div>
`,
	width : 320,
	modal : true,
	collapsible: false,
	resizable: false,
	buttons : [{
			text : 'Close',
			cmd : 'dialog-close'
		}
	]
});

var deleteokdlg = api('createDialog', {
	title: `${manifest.name} - Delete Settings`,
    content : `
    <div style="padding: 8px; text-align: center">
	Are you sure you want to delete this setting ?
    </div>
`,
	width : 320,
	modal : true,
	collapsible: false,
	resizable: false,
	buttons : [
		{
			text : 'Yes',
			cmd : createCommand(()=>{ 
				removeSelectedSetting();
				deleteokdlg.dialog('close');
			})
		},
		{
			text : 'Cancel',
			cmd : 'dialog-close'
		}
	]
});

var storesavedlg = api('createDialog', {
	title: `${manifest.name} - Store Label Settings`,
    content : `
    <div style="padding: 8px; text-align: center">
		<fieldset>
			<div class="grid">
			    <label for="extension-${extensionId}-savename" class="i18n">New Save Name</label>
				<input type="text" id="extension-${extensionId}-savename" value="" placeholder="Label Name" />
			</div>
		</fieldset>
    </div>
`,
	width : 320,
	modal : true,
	collapsible: false,
	resizable: false,
	buttons : [
		{
			text : 'Save',
			cmd : createCommand(()=>{ 
				saveNewSettings($(`#extension-${extensionId}-savename`).val());
				storesavedlg.dialog('close');
				loadStoredSettingsIntoSelect();
			})
		},
		{
			text : 'Cancel',
			cmd : 'dialog-close'
		}
	]
});


var labeldlg = api('createDialog', {
	title: `${manifest.name}`,
	content : `
	<style>
    #extension-${extensionId}-dlg fieldset {
        border: 0;
        margin-top: 4px;
    }
    #extension-${extensionId}-dlg legend {
        border-bottom: 1px solid #eee;
        width: 100%;
        font-weight: bold;
        padding: 0px;
	}
	#extension-${extensionId}-dlg .grid {
		display: grid;
		grid-template-columns: 120px auto;
		gap: 4px 0px;
		grid-template-areas:
		  ". .";
		align-items: center;
	}	  
	#extension-${extensionId}-dlg select {
        width: fit-content;
    }
	</style>
	<div id="extension-${extensionId}-dlg">
		<fieldset>
			<legend class="i18n">Stored</legend>
			<div>
				<select id="extension-${extensionId}-stored">
					<option class="default" value='{"shape-left":"(","text":"GND","shape-right":")","font":"Liberation Sans Bold","size":"9","padding-y":"1","padding-x":"0","width":"0","textalign":"left"}'>Default</option>					
				</select>
				<input type="button" id="extension-${extensionId}-storedupdate" value="=" title="Update this stored setting from current values"/>
				<input type="button" id="extension-${extensionId}-storedsave" value="+" title="Save current values a new stored setting" />
				<input type="button" id="extension-${extensionId}-storeddelete" value="x" title="Delete this stored setting" style="background-color:red;color: white;font-weight: bold;border: 2px solid black;" />
			</div>
		</fieldset>
		<fieldset>
			<legend class="i18n">Label</legend>
			<div>
				<select id="extension-${extensionId}-shape-left">
					<option value="(">(</option>
					<option value=")">)</option>
					<option value="&lt;">&lt;</option>
					<option value="&gt;">&gt;</option>
					<option value="/">/</option>
					<option value="\\">\\</option>
					<option value="|">|</option>
				</select>
				<input type="text" id="extension-${extensionId}-text" style="width:92px" placeholder="GND" value="GND">
				<select id="extension-${extensionId}-shape-right">
					<option value=")">)</option>
					<option value="(">(</option>
					<option value="&gt;">&gt;</option>
					<option value="&lt;">&lt;</option>
					<option value="/">/</option>
					<option value="\\">\\</option>
					<option value="|">|</option>
				</select>
			</div>
		</fieldset>
		<fieldset>
			<legend><span class="i18n">Options</span> <span class="i18n">[0.25mm / 0.01 inch]</span></legend>
			<div class="grid">
				<label for="extension-${extensionId}-font" class="i18n">Font</label>
				<select id="extension-${extensionId}-font"></select>
			</div>
			<div class="grid">
			    <label for="extension-${extensionId}-size" class="i18n">Font-Size</label>
				<input type="number" step="0.5" id="extension-${extensionId}-size" value="9" size="4" style="width:6em">
			</div>
			<div class="grid">
				<label for="extension-${extensionId}-padding-y" class="i18n">Padding Top/Bottom</label>
				<input type="number" step="0.5" id="extension-${extensionId}-padding-y" value="1" size="4" style="width:6em">
			</div>
			<div class="grid">
				<label for="extension-${extensionId}-padding-x" class="i18n">Padding Left/Right</label>
				<input type="number" step="0.5" id="extension-${extensionId}-padding-x" value="0" size="4" style="width:6em">
			</div>
			<div class="grid">
				<label for="extension-${extensionId}-width" class="i18n">Width [0=auto]</label>
				<input type="number" step="0.5" id="extension-${extensionId}-width" value="0" size="4" style="width:6em">
			</div>
			<div class="grid">
				<label for="extension-${extensionId}-textalign" class="i18n">Text-Align</label>
				<select id="extension-${extensionId}-textalign">
					<option value="left">left</option>
					<option value="center">center</option>
					<option value="right">right</option>
				</select>
			</div>
		</fieldset>
		<fieldset>
			<legend>Preview</legend>
			<svg id="extension-${extensionId}-preview-svg" height="32" width="100%"><path d="" id="extension-${extensionId}-preview-path"/></svg>
		</fieldset>
	</div>
`,
	width : 240,
	modal : false,
	collapsible: true,
	resizable: true,
	buttons : [{
			text : 'Place',
			cmd : createCommand(()=>{ placeLabel(); })
		}
	]
});

// Add Event-Listeners to GUI
document.querySelector(`#extension-${extensionId}-dlg`).querySelectorAll('input,select,button').forEach((el)=>{
//console.log('changed:' + el.id + ":" + el.type + ":" + $('#'+el.id).val() );

	el.addEventListener('change',(e)=>{

//		console.log('changed:' + el.id + ":" + $('#'+el.id).val());
		
		if ( el.id == `extension-${extensionId}-stored` ) {
			// get value = JSON
			// 
			// restore to fields
			
			restoreSelectionValues();

			previewLabel();
		}
		else {
			previewLabel();	
			setConfig(el.id,$('#'+el.id).val());
		}
		
	});

	el.addEventListener('keypress',(e)=>{
		if(e.key=='Enter') {
			$(`#extension-${extensionId}-text`).select();
			$(`#extension-${extensionId}-text`).focus();
			placeLabel();
		}
	});
	if ( el.type == "button" ) {
		if ( el.id == `extension-${extensionId}-storeddelete`) {
			el.addEventListener('click',(e)=>{				
				deleteokdlg.dialog('open');	
			});
		}
		else if ( el.id == `extension-${extensionId}-storedsave`){
			el.addEventListener('click',(e)=>{
				storesavedlg.dialog('open');
			});
		}
		else if ( el.id == `extension-${extensionId}-storedupdate`){
			el.addEventListener('click',(e)=>{
				var dropdown = $(`#extension-${extensionId}-stored`);
				saveNewSettings(dropdown.find(":selected").text());
			});
		}
	}
});

loadBundledFonts();
updateFontsCache();
initDialog();
Helper.checkUpdate();
setTimeout(updateFontsCache,1e3); // Files aren't always available right away, so reload later to be safe


/*
	Functions
*/


function removeSelectedSetting() {
	var dropdown = $(`#extension-${extensionId}-stored`);
	
	var dropdownSelectedText = dropdown.find(":selected").text();
	
	Helper.setStoredConfig(dropdownSelectedText,null);
	
	loadStoredSettingsIntoSelect();
}
function restoreSelectionValues() {
	//console.log('+restoreSelectionValues');
	
	var dropdown = $(`#extension-${extensionId}-stored`);
	
	var dropdownSelectedText = dropdown.find(":selected").text() || 'Default';
	
	//console.log(":" + dropdownSelectedText);
	
	var storedConfig = Helper.getAllStoredConfig();

	//console.log(":" + JSON.stringify(storedConfig));
	
	var jp = {};
	if ( dropdownSelectedText != "" ) jp = JSON.parse(storedConfig[dropdownSelectedText]);
	
	//console.log(":" + dropdown.find(":selected").text() + ":" + JSON.stringify(jp) );
	
	$.each( jp, function (a,b) { 
	//	console.log( a + ":" + $(`#extension-${extensionId}-` + a).length + " = " + b );
		$(`#extension-${extensionId}-` + a).val(b);
	});
	
	//console.log('-restoreSelectionValues');

}
function loadStoredSettingsIntoSelect() {
// load stored config from system and populate the dropdown
	//console.log('+loadStoredSettingsIntoSelect');

	var storedConfig = Helper.getAllStoredConfig();

	//console.log("allStoredCongig:" + JSON.stringify(storedConfig));
	
	var dropdown = $(`#extension-${extensionId}-stored`);
	
	var dropdownSelectedText = dropdown.find(":selected").text();
	
	//dropdown.find('option').not('.default').remove();
	dropdown.find('option').remove();

	$.each(storedConfig, function (key,value) {
		dropdown.append(
			$('<option>', {
			"value": value,
			"text": key
			})
		);
		//console.log(key + ":" + JSON.stringify(value));
	});
	
	dropdown.val(dropdownSelectedText);


	//console.log('-loadStoredSettingsIntoSelect');
	
}

function saveNewSettings(name) {
// create a new stored config based on current values
	//console.log('+saveNewSettings' + ' name:' + name.trim());
	
	var jsonSave = {};	
	
	document.querySelector(`#extension-${extensionId}-dlg`).querySelectorAll('input,select').forEach((el)=>{
		if ( ('|extension-labelmaker-stored|extension-labelmaker-storedsave|extension-labelmaker-storeddelete|extension-labelmaker-storedupdate|').indexOf('|' + el.id + '|') == -1 ) {
			
			//console.log(el.id + ":" + $('#'+el.id).val());
			
			var propName = el.id.replace("extension-labelmaker-","");
			jsonSave[propName] = $('#'+el.id).val();
			
			//if(v = getConfig(el.id,false)) $('#'+el.id).val(v);
		}

	});

	//console.log(name + ":" + JSON.stringify(jsonSave));		
	
	Helper.setStoredConfig(name,JSON.stringify(jsonSave));
	
	//console.log('-saveNewSettings');
}

function loadBundledFonts() {
	// Loads *.ttf fonts that were bundled with the extension into EasyEDAs Fonts database
	const db = simpleDB("DBEasyEDA", 9, [{exportAPI: 'files', storeName: 'files'},{exportAPI: 'fonts', storeName: 'fonts'}]);
	db.files.get(`extension-${extensionId}`,(files)=>{
		files.filter(file=>file.name.toLowerCase().endsWith('.ttf')).forEach(file=>{
			font = opentype.parse(file.contentArrayBuffer);
			if(font && font.names.fullName) {
				let nameLanguages = Object.keys(font.names.fullName);
				let nameLanguage = nameLanguages.includes('en') ? 'en' : nameLanguages[0];
				let name = font.names.fullName[nameLanguage];
				db.fonts.put(name,file.contentArrayBuffer);
				console.log(`Bundled Font "${file.name}" loaded as "${name}"`);
			} else {
				console.error(`Bundled Font "${file.name}" was not parsed correctly!`);
			}
		})
	})
}

function updateFontsCache() {
    const db = simpleDB("DBEasyEDA", 9, [{exportAPI: 'fonts', storeName: 'fonts'}]);
    db.fonts.each((cursor,next)=>{
        if(!opentypeFontCache.map(e=>e.key).includes(cursor.key)) {
            font = opentype.parse(cursor.value);
            font.key = cursor.key;
            font.buffer = cursor.value;
            opentypeFontCache.push(font);
        }
        next();
    }); 
}

function initDialog() {
	// Restore Dialog values from localStorage
	document.querySelector(`#extension-${extensionId}-dlg`).querySelectorAll('input,select').forEach((el)=>{
		if(v = getConfig(el.id,false)) $('#'+el.id).val(v);
	})
	loadStoredSettingsIntoSelect();
	restoreSelectionValues();
}

function getLabelOptions() {
	return {
		text: $(`#extension-${extensionId}-text`).val().length ? $(`#extension-${extensionId}-text`).val() : '?',
		size: Number($(`#extension-${extensionId}-size`).val()),
		fontfamily: $(`#extension-${extensionId}-font`).val(),
		width: Number($(`#extension-${extensionId}-width`).val()),
		textalign: $(`#extension-${extensionId}-textalign`).val(),
		padding: {
			x: Number($(`#extension-${extensionId}-padding-x`).val()),
			y: Number($(`#extension-${extensionId}-padding-y`).val()),
		},
		shape: {
			left: $(`#extension-${extensionId}-shape-left`).val(),
			right: $(`#extension-${extensionId}-shape-right`).val(),
		}
	}
}

function placeLabel() {
	options = getLabelOptions();
	api('editorCall',{ cmd:'importByPathD', args:[ createLabelPath(options) ]});
	// Abort and refocus dialog after click/place
	api('editorCall',{ cmd:'getElementById', args: ['root']}).addEventListener('click',(e)=>{
		editorAbort();
		$(`#extension-${extensionId}-text`).select();
		$(`#extension-${extensionId}-text`).focus();
	},{once:true});
}

function editorAbort() {
	// aborts placing whatever you have selected currently
	api('editorCall',{ cmd:'dragMoveSwitch'});
	api('editorCall',{ cmd:'dragMoveSwitch'});
}

function previewLabel() {
	options = getLabelOptions();
	document.querySelector(`#extension-${extensionId}-preview-path`).setAttribute('d',createLabelPath(options));
	autoScaleViewBox(document.querySelector(`#extension-${extensionId}-preview-svg`));
}

function reloadFontList() {
	var el = document.querySelector(`#extension-${extensionId}-font`);
	var selectedFont = el.value || getConfig(el.id);
	while(e=el.firstChild) el.removeChild(e); // remove all options
	const fonts = opentypeFontCache.map((f)=>f.key);
    fonts.forEach( font => {
		selected = font==selectedFont ? 'selected' : '';
        el.insertAdjacentHTML("beforeend",`<option value="${font}" ${selected}>${font}</option>`);
	});
	labeldlg.dialog('setWidth',Math.max(el.clientWidth,70)+150);
}

function autoScaleViewBox(el) {
	b = el.getBBox();
	el.setAttribute('viewBox',`${b.x} ${b.y} ${b.width} ${b.height}`);
}

function createLabelPath(options) {
	// store options in local vars
	const size = options.size;
	const paddingV = options.padding.y;
	const paddingH = options.padding.x;
	const shapeR = options.shape.right;
	const shapeL = options.shape.left;
	const fontfamily = options.fontfamily;
	const width = options.width;
	const textalign = options.textalign;
	// get opentype.js font instance from cache (generated in loadfonts.js)
	font = opentypeFontCache.filter(f=>f.key==fontfamily)[0];
	if(!font) {
		$.messager.error('Font not found!');
		return '';
	}
	// get Bounds for Char "X" to calculate height (ignore chars below baseline like "y")
	bbx = font.getPath('X', 0, 0, size).getBoundingBox();
	const textHeight = bbx.y2 - bbx.y1;
	// get Text as opentype.js Path and its width
	text = font.getPath(options.text, 0, 0, size);
	bb = text.getBoundingBox();
	const textWidth = bb.x2 - bb.x1;
	
	// create new empty paper.js project and import this path
	ppText = new paper.Project();
	ppText.importSVG(text.toSVG());
	// all glyphs will get united to one single path (solves lots of clipping/intersection issues)
	combinedText = ppText.getItems()[0].getItems()[0].unite();

	// get text boundings including padding
	paddedBoundingBox = {
		x1: bb.x1-paddingH,
		x2: bb.x2+paddingH,
		y1: bbx.y1-paddingV,
		y2: bbx.y2+paddingV,
		height: bbx.y2-bbx.y1+paddingV*2,
		width: bb.x2-bb.x1 + paddingH*2,
	}

	// get bounds for the final shape
	shapeBounds = {
		x_left_out: paddedBoundingBox.x1-paddedBoundingBox.height/2,
		x_left_mid: paddedBoundingBox.x1-paddedBoundingBox.height/4,
		x_left_in: paddedBoundingBox.x1,
		x_right_in: paddedBoundingBox.x2,
		x_right_mid: paddedBoundingBox.x2+paddedBoundingBox.height/4,
		x_right_out: paddedBoundingBox.x2+paddedBoundingBox.height/2,
		y_top: paddedBoundingBox.y1,
		y_mid: paddedBoundingBox.y1+paddedBoundingBox.height/2,
		y_bottom: paddedBoundingBox.y2,
		width: paddedBoundingBox.x2-paddedBoundingBox.x1+paddedBoundingBox.height
	}

	// offset shape bounds for fixed size
	shapeAlignOffset = width - paddedBoundingBox.width + paddedBoundingBox.height;
	if(width != 0) {
		shapeBounds.width += shapeAlignOffset;
		if(textalign == 'right') {
			shapeBounds.x_left_out -= shapeAlignOffset;
			shapeBounds.x_left_mid -= shapeAlignOffset;
			shapeBounds.x_left_in -= shapeAlignOffset;
		}
		if(textalign == 'left') {
			shapeBounds.x_right_out += shapeAlignOffset;
			shapeBounds.x_right_mid += shapeAlignOffset;
			shapeBounds.x_right_in += shapeAlignOffset;
		}
		if(textalign == 'center') {
			shapeBounds.x_left_out -= shapeAlignOffset/2;
			shapeBounds.x_left_mid -= shapeAlignOffset/2;
			shapeBounds.x_left_in -= shapeAlignOffset/2;
			shapeBounds.x_right_out += shapeAlignOffset/2;
			shapeBounds.x_right_mid += shapeAlignOffset/2;
			shapeBounds.x_right_in += shapeAlignOffset/2;
		}
	}

	// Draw the Outline Path
	var box = new paper.Path();
	// Right Cap
	if( shapeR == ']' || shapeR == '|' ) {
		box.moveTo([ shapeBounds.x_right_out, shapeBounds.y_top ]);
		box.lineTo([ shapeBounds.x_right_out, shapeBounds.y_bottom ]);
	}
	if( shapeR == '/' ) {
		box.moveTo([ shapeBounds.x_right_out, shapeBounds.y_top ]);
		box.lineTo([ shapeBounds.x_right_mid, shapeBounds.y_bottom ]);
	}
	if( shapeR == '\\' ) {
		box.moveTo([ shapeBounds.x_right_mid , shapeBounds.y_top ]);
		box.lineTo([ shapeBounds.x_right_out, shapeBounds.y_bottom ]);
	}
	if( shapeR == '>' ) {
		box.moveTo([ shapeBounds.x_right_mid , shapeBounds.y_top ]);
		box.lineTo([ shapeBounds.x_right_out , shapeBounds.y_mid ]);
		box.lineTo([ shapeBounds.x_right_mid , shapeBounds.y_bottom ]);
	}
	if( shapeR == '<' ) {
		box.moveTo([ shapeBounds.x_right_out , shapeBounds.y_top ]);
		box.lineTo([ shapeBounds.x_right_mid , shapeBounds.y_mid ]);
		box.lineTo([ shapeBounds.x_right_out , shapeBounds.y_bottom ]);
	}
	if( shapeR == ')' ) {
		box.moveTo([ shapeBounds.x_right_in , shapeBounds.y_top ]);
		box.arcTo([ shapeBounds.x_right_out , shapeBounds.y_mid ], [ shapeBounds.x_right_in , shapeBounds.y_bottom ]);
	}
	if( shapeR == '(' ) {
		box.moveTo([ shapeBounds.x_right_out , shapeBounds.y_top ]);
		box.arcTo([ shapeBounds.x_right_in , shapeBounds.y_mid ], [ shapeBounds.x_right_out , shapeBounds.y_bottom ]);
	}
	// Left Cap
	if( shapeL == '[' || shapeL == '|' ) {
		box.lineTo([ shapeBounds.x_left_out, shapeBounds.y_bottom ]);
		box.lineTo([ shapeBounds.x_left_out, shapeBounds.y_top ]);
	}
	if( shapeL == '/' ) {
		box.lineTo([ shapeBounds.x_left_out, shapeBounds.y_bottom ]);
		box.lineTo([ shapeBounds.x_left_mid, shapeBounds.y_top ]);
	}
	if( shapeL == '\\' ) {
		box.lineTo([ shapeBounds.x_left_mid , shapeBounds.y_bottom ]);
		box.lineTo([ shapeBounds.x_left_out, shapeBounds.y_top ]);
	}
	if( shapeL == '<' ) {
		box.lineTo([ shapeBounds.x_left_mid , shapeBounds.y_bottom ]);
		box.lineTo([ shapeBounds.x_left_out , shapeBounds.y_mid ]);
		box.lineTo([ shapeBounds.x_left_mid , shapeBounds.y_top ]);
	}
	if( shapeL == '>' ) {
		box.lineTo([ shapeBounds.x_left_out , shapeBounds.y_bottom ]);
		box.lineTo([ shapeBounds.x_left_mid , shapeBounds.y_mid ]);
		box.lineTo([ shapeBounds.x_left_out , shapeBounds.y_top ]);
	}
	if( shapeL == '(' ) {
		box.lineTo([ shapeBounds.x_left_in , shapeBounds.y_bottom ]);
		box.arcTo([ shapeBounds.x_left_out , shapeBounds.y_mid ], [ shapeBounds.x_left_in , shapeBounds.y_top ]);
	}
	if( shapeL == ')' ) {
		box.lineTo([ shapeBounds.x_left_out , shapeBounds.y_bottom ]);
		box.arcTo([ shapeBounds.x_left_in , shapeBounds.y_mid ], [ shapeBounds.x_left_out , shapeBounds.y_top ]);
	}
	box.closePath();
	// Subtract text from outline to create final label
	label = box.subtract(combinedText);
	//label.flatten(0.1);
	return reparseSVGPath(label.exportSVG().getAttribute('d'));
}


function reparseSVGPath(pathData) {
	// Normalizes the SVG path because EasyEDA cannot handle all commands (e.g. relative commands)
    // Add spaces around chars ( M5,5L8,8 -> M 5,5 L 8,8 ) except e which is used as 42e-3
    const regex_chars = /([a-df-zA-DF-Z])/g;
    pathData = pathData.replaceAll(regex_chars,' $1 ');
    // Add spaces before minus ( M5-5 -> M5 -5 )
    const regex_minus = /([^eE])(-)/g;
    pathData = pathData.replaceAll(regex_minus,'$1 $2');
    // Normalize spaces / remove comma ( M5-5L8,8 -> M 5 -5 L 8 8 )
    const regex_svg = /[^0-9a-zA-Z-\.]+/g;
    pathData = pathData.replaceAll(regex_svg,' ').trim();

    var c = pathData.split(' ');
    var idx = 0;
    var cx = 0;
    var cx = 0;
    var zx = 0;
    var zy = 0;
    var k1x = k1y = k2x = k2y = rx = ry = rt = f1 = f2 = 0;
    var sx = 1;
    var sy = 1;
    var ox = 0;
    var oy = 0;
    var o = Array();
    var lastCmd = 'M';

    // Parsing the SVG. Converting all relative commands to absolute and stripping commands not supported!
    while(idx < c.length) {
        // Parse the current command
        if(isNaN(Number(c[idx]))) {
            // save the current/last command for repetitions
            lastCmd = c[idx];
        } else {
            // additional coordinates are parsed using the last known command
            idx--;
            // If the last used command was M/m this one will be L/l
            if(lastCmd == 'M') lastCmd = 'L';
            if(lastCmd == 'm') lastCmd = 'l';
        }
        switch(lastCmd) {
            case 'M':
                cx = zx = Number(c[++idx]);
                cy = zy = Number(c[++idx]);
                o = [...o, 'M', cx*sx+ox, cy*sy+oy];
                break;
            case 'm':
                cx = zx += Number(c[++idx]);
                cy = zy += Number(c[++idx]);
                o = [...o, 'M', cx*sx+ox, cy*sy+oy];
                break;
            case 'Z':
            case 'z':
                cx = zx;
                cy = zy;
                o = [...o, 'L', cx*sx+ox, cy*sy+oy];
                break;
            case 'L':
                cx = Number(c[++idx]);
                cy = Number(c[++idx]);
                o = [...o, 'L', cx*sx+ox, cy*sy+oy];            
                break;
            case 'l':
                cx += Number(c[++idx]);
                cy += Number(c[++idx]);
                o = [...o, 'L', cx*sx+ox, cy*sy+oy];
                break;
            case 'H':
                cx = Number(c[++idx]);
                o = [...o, 'L', cx*sx+ox, cy*sy+oy];
                break;
            case 'h':
                cx += Number(c[++idx]);
                o = [...o, 'L', cx*sx+ox, cy*sy+oy];            
                break;
            case 'V':
                cy = Number(c[++idx]);
                o = [...o, 'L', cx*sx+ox, cy*sy+oy];            
                break;
            case 'v':
                cy += Number(c[++idx]);
                o = [...o, 'L', cx*sx+ox, cy*sy+oy];            
                break;
            case 'Q':
                k1x = Number(c[++idx]);
                k1y = Number(c[++idx]);
                cx = Number(c[++idx]);
                cy = Number(c[++idx]);
                o = [...o, 'Q', k1x*sx+ox, k1y*sy+oy, cx*sx+ox, cy*sy+oy];
                break;
            case 'q':
                k1x = cx + Number(c[++idx]);
                k1y = cy + Number(c[++idx]);
                cx += Number(c[++idx]);
                cy += Number(c[++idx]);
                o = [...o, 'Q', k1x*sx+ox, k1y*sy+oy, cx*sx+ox, cy*sy+oy];
                break;
            case 'T':
                k1x = cx + (cx-k1x);
                k1y = cy + (cy-k1y);
                cx = Number(c[++idx]);
                cy = Number(c[++idx]);
                o = [...o, 'Q', k1x*sx+ox, k1y*sy+oy, cx*sx+ox, cy*sy+oy];
                break;
            case 't':
                k1x = cx + (cx-k1x);
                k1y = cy + (cy-k1y);
                cx += Number(c[++idx]);
                cy += Number(c[++idx]);
                o = [...o, 'Q', k1x*sx+ox, k1y*sy+oy, cx*sx+ox, cy*sy+oy];
                break;
            case 'C':
                k1x = Number(c[++idx]);
                k1y = Number(c[++idx]);
                k2x = Number(c[++idx]);
                k2y = Number(c[++idx]);
                cx = Number(c[++idx]);
                cy = Number(c[++idx]);
                o = [...o, 'C', k1x*sx+ox, k1y*sy+oy, k2x*sx+ox, k2y*sy+oy, cx*sx+ox, cy*sy+oy];
                break;
            case 'c':
                k1x = cx + Number(c[++idx]);
                k1y = cy + Number(c[++idx]);
                k2x = cx + Number(c[++idx]);
                k2y = cy + Number(c[++idx]);
                cx += Number(c[++idx]);
                cy += Number(c[++idx]);
                o = [...o, 'C', k1x*sx+ox, k1y*sy+oy, k2x*sx+ox, k2y*sy+oy, cx*sx+ox, cy*sy+oy];
                break;
            case 'S':
                k1x = cx + (cx-k2x);
                k1y = cy + (cy-k2y);  
                k2x = Number(c[++idx]);
                k2y = Number(c[++idx]);
                cx = Number(c[++idx]);
                cy = Number(c[++idx]);
                o = [...o, 'C', k1x*sx+ox, k1y*sy+oy, k2x*sx+ox, k2y*sy+oy, cx*sx+ox, cy*sy+oy];
                break;
            case 's':
                k1x = cx + (cx-k2x);
                k1y = cy + (cy-k2y);
                k2x = cx + Number(c[++idx]);
                k2y = cy + Number(c[++idx]);
                cx += Number(c[++idx]);
                cy += Number(c[++idx]);
                o = [...o, 'C', k1x*sx+ox, k1y*sy+oy, k2x*sx+ox, k2y*sy+oy, cx*sx+ox, cy*sy+oy];
                break;
            case 'A':
                rx = Number(c[++idx]);
                ry = Number(c[++idx]);
                rt = Number(c[++idx]);
                f1 = Number(c[++idx]);
                f2 = Number(c[++idx]);
                cx = Number(c[++idx]);
                cy = Number(c[++idx]);
                o = [...o, 'A', rx*sx, ry*sy, rt, f1, f2, cx*sx+ox, cy*sy+oy];
                break;
            case 'a':
                rx = Number(c[++idx]);
                ry = Number(c[++idx]);
                rt = Number(c[++idx]);
                f1 = Number(c[++idx]);
                f2 = Number(c[++idx]);
                cx += Number(c[++idx]);
                cy += Number(c[++idx]);
                o = [...o, 'A', rx*sx, ry*sy, rt, f1, f2, cx*sx+ox, cy*sy+oy];
                break;
            default:
                // Flag unknown command
                console.error(`Unexpected SVG Command "${lastCmd}" at idx ${idx} sequence "... ${c[idx-1]} > ${c[idx]} < ${c[idx+1]} ..."`);
                unknownCommandFlag = true;
                return '';
        }
        idx++;
    }
    return o.join(' ');
}

// ♥ https://cwestblog.com/2013/02/26/javascript-string-prototype-matchall/
if(!String.prototype.matchAll) {
    String.prototype.matchAll = function(regexp) {
    var matches = [];
    this.replace(regexp, function() {
      var arr = ([]).slice.call(arguments, 0);
      var extras = arr.splice(-2);
      arr.index = extras[0];
      arr.input = extras[1];
      matches.push(arr);
    });
    return matches.length ? matches : null;
  };
}

// ♥ https://gomakethings.com/how-to-write-your-own-vanilla-js-polyfill/
if (!String.prototype.replaceAll) {
	String.prototype.replaceAll = function (str, newStr){
		// If a regex pattern
		if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
			return this.replace(str, newStr);
		}
		// If a string
		return this.replace(new RegExp(str, 'g'), newStr);
	};
}
