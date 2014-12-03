function allen(_file){

	console.log("allen.js")

	var initialFamilySize = 1; 
	var initialAGI = 0;

	familyText(initialFamilySize);
	agiText(initialAGI);
 

	d3.csv(_file,function(data){

		console.log("csv file loaded");
		console.log("data file");
		console.log(data);

		var eventDispatcher = d3.dispatch("familyFilter","agiFilter","getRate");
		var xf = crossfilter().add(data);
		var familySize = xf.dimension(function(d){return +d.Size});
		var rateDimension = xf.dimension(function(d){return +d.Rate});
		var agiDimension = xf.dimension(function(d){return [+d.Low,+d.High]});
		var userInput = {};
		userInput.family = initialFamilySize;
		userInput.agi = initialAGI;


		d3.select("#familySize").on("input", function() {
  			eventDispatcher.familyFilter(+this.value);
		});


		d3.select("#agi").on("input",function(){
			eventDispatcher.agiFilter(+this.value);
		});

		eventDispatcher.on('familyFilter',function(_fam){
			familySize.filter(_fam);
			familyText(_fam);
			userInput.family = _fam;
			console.log(userInput);
			eventDispatcher.getRate();
		});


		eventDispatcher.on('agiFilter',function(_agi){
			agiDimension.filterFunction(agiBracket(_agi));
			agiText(_agi);
			userInput.agi = _agi;
			console.log(userInput);
			eventDispatcher.getRate();
	
		});
			
		eventDispatcher.on('getRate',function(){
			var rateBrackets = rateDimension.bottom(Infinity);
			var acaTax = rateBrackets[0].Rate;
		
			d3.select("#rate-value").text(acaTax);
			
			if(rateBrackets[0].Low!=0){
				var lower = userInput.agi - rateBrackets[0].Low -1;
				d3.select("#lowerAGI-value").text(lower);
			} else {
				d3.select("#lowerAGI-value").text(0);};
			});

	});

	function getMaxAGI(_data,_size){
		var extent = d3.extent(_data,function(d,i){
			if(d.Size == _size) return d.High;
		});
		return extent[1];
	};

	function agiBracket(_agi){
		return function (d){
		if(_agi >= d[0] && _agi <= d[1]) return true;
			return false;}
	};

	function familyText(_text){
		d3.select("span#familySize-value").text(_text);
		d3.select("input#familySize").attr("value",_text);
	};

	function agiText(_text){
		d3.select("input#agi").attr("value",_text);
	}


}
