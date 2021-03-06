var exec = require('child_process').exec;
var fs = require('fs');
var flow = require('nimble');
var fileModule = require('fileModule');
var jsModule = require('javaScriptModule');

var languageToFileMap = {'java' : 'java.properties',
						  'php' : 'php.properties' ,
						   'js' : 'js.properties' };
//var JavaProjectTypes = require('JavaProjectTypes');						   

var sonarRunnerCommand= 'sonar-runner';

var nameOfPropertiesFile = 'sonar-project.properties';


var basePropertiesPath = function(){
	return __dirname.replace('node_modules','base_properties');
};


//-------- should be in seperate module ----------------
function MavenProject (options){
 	this.options = options;
 }

MavenProject.prototype.execute = function(){
	var commands = [];
 	commands[0] = 'mvn clean install';
    commands[1] = 'mvn sonar:sonar';
    executeTwoCommands(this.options, commands);
}

 function AntProject(options){
 	this.options = options;
 }

 AntProject.prototype.execute = function(){
 	var commands = [];
 	commands[0] = 'ant build';
    commands[1] = sonarRunnerCommand;
    executeTwoCommands(this.options, commands);
}

function OtherProject(options){
	this.options = options;
}

OtherProject.prototype.execute = function(){
	var commands = [];
	commands[0] = sonarRunnerCommand;
	commands[1] = 'none';
	executeTwoCommands(this.options, commands);
}
//----------------------------------------------



exports.analyze = function(properties){

	 var configPlaceholders = {'UNIQUE_KEY' : escapeCharacters(properties.link),
							  'NAME' : properties.nameOfGitRepo };//config placeholders 
	
	flow.series([
		 function(callback){
	 		console.log("--->step1 - generating properties file");
	 		//TODO propertyFile
            generatePropertiesFile(properties, configPlaceholders, callback);
 	 	},
	 	function(callback){
	 		startSonarRunnerClient(properties);
		}		
	
     ]);
     
}


function startSonarRunnerClient(properties){
		
	 	var language = properties['language'];
		var projectLocation = properties['projectLocation']; 
		
		console.log('--->step2 - going to projectLocation : ' + projectLocation);
	 	
		if(language === 'java'){
	 	 	startJavaClient(properties);
	 	 }else{
	 	 	startOtherLanguagesClient(projectLocation);
	 	 }

	 	 

}

function startJavaClient(properties){

	var projectLocation = properties['projectLocation']; 
	var javaBuildCommand = properties['javaBuildCommand'];
	console.log('-----> java build command : ' + javaBuildCommand); 
	
	if(javaBuildCommand){
		console.log("** user typed java build command :");
		var options = {
            cwd: projectLocation
	 	 };
	 	 var commands = [];
	 	 commands[0] = javaBuildCommand;
	 	 commands[1] = sonarRunnerCommand;
	 	 executeTwoCommands(options,commands);
		//customSonarCommand(properties);
	}
	else{
		checkTypeOfJavaProject(projectLocation);
	}
}


function startOtherLanguagesClient(projectLocation){
	 var options = {
            cwd: projectLocation
	 	 };

	 	 var commands = [];
	 	 commands[0] = sonarRunnerCommand;
	 	 commands[1] = 'none';
	 	 executeTwoCommands(options,commands);
}


function generatePropertiesFile(properties ,propertiesToChange, callback) {

	var language = properties['language'];
	var projectLocation = properties['projectLocation'];

	var delimeter  = '/';
	var srcPath = basePropertiesPath() + delimeter + languageToFileMap[language];
	console.log("sourcepath : " + srcPath);
	var destPath = projectLocation + delimeter + nameOfPropertiesFile;
	console.log("destPath : " + projectLocation);


	var saveNewProperties = function(propertiesToChange){  
		fileModule.copyFileAndChangeProperties(srcPath, destPath, propertiesToChange,
	  		function(err){
				console.log("fileSuccesfully copied + err : " + err);
				callback();
			});
	};

	if(language === 'js'){
		console.log("--> before findSrcLocation for js");
		jsModule.findSrcLocation(projectLocation ,propertiesToChange, saveNewProperties);
    }else{
		saveNewProperties(propertiesToChange);
	}
}

function escapeCharacters(newId){
	var charToBeEscape = '/';
	var charToEscape = '_';
	return replaceAll(charToBeEscape, charToEscape, newId);
}

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}


exports.getUrlOfAnalyzedProject = function(projectLink){
	var sonarUrl = "http://localhost:9000/dashboard/index/";//should be changed on prod
    return sonarUrl+escapeCharacters(projectLink);
    	
}


function checkTypeOfJavaProject(projectLocation){
	 var options = {
            cwd: projectLocation
	 	 };

	var finder = require('findit').find(projectLocation);

    var typeOfProject;
	var locationsOfBuildFiles = [];
    var counter = 0;
	
	//This listens for files found
	finder.on('file', function (file) {
		
		if(file.indexOf('pom.xml') != -1){
			console.log("+++++++ its maven project");
			//typeOfProject = 'maven';
			typeOfProject = new MavenProject(options);
			locationsOfBuildFiles.push(file);
			
		}else if(file.indexOf('build.xml') != -1){
			typeOfProject = new AntProject(options);
			locationsOfBuildFiles.push(file);
		}else if(file.indexOf('build.gradle') != -1){
			//typeOfProject = 'gradle';
			typeOfProject = new OtherProject(options);
			locationsOfBuildFiles.push(file);
		}
		
  		
	});

	finder.on('end',function(){
		console.log('-------->type of java project : ' + typeOfProject);
		console.log('locationsOfBuildFiles : ' + locationsOfBuildFiles);

		  typeOfProject.execute();
	});
}

//TODO executeCommands more generic way
function executeTwoCommands(options, commands){
	var projectLocation = options['cwd']; 
	
	 exec(commands[0],options,function(err, stdout, stderr){
	 	console.log("--->after first command : " + stdout);
     	 	exec(commands[1],options,function(err, stdout,stderr){
     	 		console.log("--->after second command");
     	 		console.log('stdout : ' + stdout); 
				fileModule.deleteFolder(projectLocation);
     	 	});
     	 });
	 	 
}

function executeCommands(options, commands){
	var projectLocation = options['cwd'];

	var length = commands.length - 1;
	var innerExec = function(){
						exec(commands[length],options,function(err, stdout,stderr){
     	 				console.log("--->after last command");
     	 				console.log('stdout : ' + stdout); 
						fileModule.deleteFolder(projectLocation);
     	 				});
					};

	for(var i = length - 1; i >= 0; i--){
		console.log("--->i : " +i);
			//innerExec  = function(){
				 exec(commands[i], options, function(err, stdout, stderr){
					console.log("-->after " + i + "command");
					console.log("stdout : " + stdout );
					innerExec();
				});
			//};
	}
	innerExec();

}	

