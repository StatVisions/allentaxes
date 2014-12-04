function allen(_file){

	console.log("allen.js")

	var initialFamilySize = 1; 
	var initialAGI = 0;

	agiText(initialAGI);
 

	d3.csv(_file,function(data){

		setMaxAGI(data,initialFamilySize);

		console.log("csv file loaded");
		console.log("data file");
		console.log(data);

		var eventDispatcher = d3.dispatch("familyFilter","agiFilter","getRate","getRateAlternate");
		var xf = crossfilter().add(data);
		var familySize = xf.dimension(function(d){return +d.Size});
		var rateDimension = xf.dimension(function(d){return +d.Rate});
		var agiDimension = xf.dimension(function(d){return [+d.Low,+d.High]});
		
		var userInput = {};
		userInput.family = initialFamilySize;
		userInput.agi = initialAGI;
		userInput.agiMax = getMaxAGI(data,userInput.family);
		console.log(userInput);


		d3.select("#familySize").on("input", function() {
  			eventDispatcher.familyFilter(+this.value);
		});


		d3.select("#agi").on("input",function(){
			eventDispatcher.agiFilter(+this.value);
		});

		eventDispatcher.on('familyFilter',function(_size){
			familySize.filter(_size);
			userInput.family = _size;
			setMaxAGI(data,_size);
			userInput.agiMax = getMaxAGI(data,_size); // <- optimize

			if(userInput.agi <= userInput.agiMax) { 
				eventDispatcher.getRate();}
			else {
				eventDispatcher.getRateAlternate(userInput.agi);
			};

			console.log(userInput);
		});


		eventDispatcher.on('agiFilter',function(_agi){
			userInput.agi = _agi;
			if(_agi >= 0 && _agi <= userInput.agiMax){
				agiDimension.filterFunction(agiBracket(_agi));
				agiText(_agi);
				eventDispatcher.getRate();
			} else {
				eventDispatcher.getRateAlternate(_agi);
			}
			console.log(userInput);
		});
			
		eventDispatcher.on('getRate',function(){
			var rateBrackets = rateDimension.bottom(Infinity);
			var acaTax = rateBrackets[0].Rate;
			rateText(acaTax);
			
			if(rateBrackets[0].Low!=0){
				var _reduceAgi = userInput.agi - rateBrackets[0].Low -1;
				reduceAgiText(_reduceAgi);
			} else { 
				reduceAgiText(0)}
		});

		eventDispatcher.on('getRateAlternate',function(_agi){
			rateText(1);
			var _reduceAgi = _agi - userInput.agiMax -1;
			reduceAgiText(_reduceAgi);
		});

	});

	function getMaxAGI(_data,_size){
		var extent = d3.extent(_data,function(d,i){
			if(d.Size == _size) return d.High;
		});
		return extent[1];
	};

	function setMaxAGI(_data,_size){
		var masAlto = getMaxAGI(_data,_size);
		d3.select("input#agi").attr("max",masAlto);
	};

	function agiBracket(_agi){
		return function (d){
		if(_agi >= d[0] && _agi <= d[1]) return true;
			return false;}
	};

	function agiText(_text){
		d3.select("input#agi").attr("value",_text);
	};

	function rateText(_rate){
		d3.select("#rate-value").text(_rate);
	};

	function reduceAgiText(_agiReduction){
		d3.select("#lowerAGI-value").text(_agiReduction);
	};


}
