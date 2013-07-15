var fs = require('fs');

exports.findSrcLocation = function(projectLocation, propertiesToChange, callback){
	console.log('--> in find src location');
	var finder = require('findit').find(projectLocation);
	var directoriesWithJsFile = [];

	//finder.on('directory', function (dir) {
    //	console.log(dir + '/');
	//});
	finder.on('file', function (file) {
		if( contains( file, '.js' ) ){
    	console.log(file);
    	directoriesWithJsFile.push(extractDirectory(file));
    	}
	});
	finder.on('end', function(){
		console.log('find js files in : ' + directoriesWithJsFile);
		propertiesToChange.SRC = directoriesWithJsFile;
		callback(propertiesToChange);
	});
		
}

function contains(path, expression){
	if(path.indexOf(expression) != -1) 
		return true;
	return false;

} 

function extractDirectory(path){
	var delimeter = '/';
	var splittedPath = path.split(delimeter);
	var indexOfLastElement = splittedPath.length - 1;
	var nameToCutFromPath = splittedPath[indexOfLastElement];
	var result = path.substring(0, path.length - nameToCutFromPath.length);
	console.log("----> result of extracting :  " + result);
	return result;


}