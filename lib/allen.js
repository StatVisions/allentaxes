function allen(maxPremiumCapTable,silverRateTable){

	console.log("allen.js")
	
	var setHouseholdSize = 1; 
	var setAGI = 0;
	var eventDispatcher = d3.dispatch("householdInput","agiInput","calc","calcAlternate","ageRangeInput","regionInput");
	
	agiText(setAGI);
 
	//////////////////////////////////////////////////////
	// Mex Premium Calculation
	//////////////////////////////////////////////////////

	d3.csv(maxPremiumCapTable,function(data){

		setMaxAGI(data,setHouseholdSize);

		console.log(" maxPremiumCapTable csv file loaded");
		

		// set up bracket indexes for each house hold size, 1-6
		var j = 1;
		for (var i = 0; i < data.length ; i++) {
			data[i].Low == 0 ? j = 1 : j++;
			data[i].bracket = j;
		};

		// console.log(data);

		
		var xf = crossfilter().add(data);
		var householdSize = xf.dimension(function(d){return +d.Size});
		var rateDimension = xf.dimension(function(d){return +d.Rate});
		var agiDimension = xf.dimension(function(d){return [+d.Low,+d.High]});
		
		var userInput = {};
		userInput.householdSize = setHouseholdSize;
		userInput.agi = setAGI;
		userInput.agiMax = getMaxAGI(data,userInput.householdSize);



		d3.select("#householdSize").on("input", function() {
  			eventDispatcher.householdInput(+this.value);
		});


		d3.select("#agi").on("input",function(){
			eventDispatcher.agiInput(+this.value);
		});

		eventDispatcher.on('householdInput',function(_size){
			console.log('householdInput');
			householdSize.filter(_size);
			userInput.householdSize = _size;
			setMaxAGI(data,_size);
			userInput.agiMax = getMaxAGI(data,_size); // <- optimize
			eventDispatcher.agiInput(userInput.agi);

			if(userInput.agi <= userInput.agiMax) { 
				eventDispatcher.calc();}
			else {
				eventDispatcher.calcAlternate(userInput.agi);
			};

			console.log(userInput);
		});


		eventDispatcher.on('agiInput',function(_agi){
			console.log('ageInput')
			userInput.agi = _agi;
			if(_agi >= 0 && _agi <= userInput.agiMax){
				agiDimension.filterFunction(agiBracket(_agi));
				agiText(_agi);
				eventDispatcher.calc();
			} else {

				eventDispatcher.calcAlternate(_agi);
			}
			console.log(userInput);
		});
			
		eventDispatcher.on('calc',function(){
			console.log('calc');
			var rateBrackets = rateDimension.bottom(Infinity);
			// set agi bracket
			userInput.Bracket = rateBrackets[0].bracket;
			medicade(userInput.Bracket);
			var acaTax = rateBrackets[0].Rate;
			rateText(acaTax);
			

			if(rateBrackets[0].Low!=0){
				var lowerBracket = rateBrackets[0].Low;
				if(userInput.Bracket == 6){
					// highest two brackets have identical rates
					// so factor adjustment is necessary
					var lowerBracket = .625*userInput.agiMax - 1;
				}
				var _reduceAgi = userInput.agi - lowerBracket+1;
				reduceAgiText(_reduceAgi);
			} else { 
				reduceAgiText(0)}
		});

		eventDispatcher.on('calcAlternate',function(_agi){
			console.log('calcAlternate');
			userInput.Bracket = undefined;
			medicade(userInput.Bracket);
			rateText("AGI exceeds 400% FPL");
			var _reduceAgi = _agi - userInput.agiMax -1;
			reduceAgiText(_reduceAgi);
		});

		// intial page load
		eventDispatcher.householdInput(userInput.householdSize);
		eventDispatcher.agiInput(userInput.agi);

	});

	function getMaxAGI(_data,_size){
		var extent = d3.extent(_data,function(d,i){
			if(d.Size == _size) return d.High;
		});
		return extent[1];
	};

	function setMaxAGI(_data,_size){
		// set the max value for the html input form
		var masAlto = getMaxAGI(_data,_size);
		d3.select("input#agi").attr("max",masAlto);
	};

	function agiBracket(_agi){
		// test if the agi is in the bracket
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

	function medicade(_bracket){
		d3.select("div#medicade").transition().style("opacity",_bracket==1 ? 1:0);
	}

	//////////////////////////////////////////////////////
	// Credit Calculation
	//////////////////////////////////////////////////////

	d3.csv(silverRateTable,function(data){
		
		var regionList = [], ageRangeList = [];

		for (var i = 0; i < data.length; i++) {
			regionList[i] = data[i]["Region"];
		};

		for (var i = 0; i < data.length; i++) {
			ageRangeList[i] = data[i]["Age Range"];
		};

		var uniqueRegions = d3.set(regionList).values();
		uniqueRegions.sort();
		var uniqueAgeRanges = d3.set(ageRangeList).values();
		uniqueAgeRanges.sort();

		console.log(uniqueRegions);
		console.log(uniqueAgeRanges);

		d3.select("select#region").selectAll("option")
			.data(uniqueRegions)
			.enter()
			.append("option")
			.attr("value",function(d){return d;})
			.text(function(d){return d;});

		d3.select("select#agerange").selectAll("option")
			.data(uniqueAgeRanges)
			.enter()
			.append("option")
			.attr("value", function(d){return d;})
			.text(function(d){return d;});


		var _xf = crossfilter();
		_xf.add(data);
		var ageRange = _xf.dimension(function(d){return d["Age Range"]});
		var region = _xf.dimension(function(d){return d.Region;});

		d3.select("#agerange").on("input", function() {
  			eventDispatcher.ageRangeInput(this.value);
		});

		d3.select("#region").on("input", function() {
  			eventDispatcher.regionInput(this.value);

		});

		eventDispatcher.on('ageRangeInput',function(_ageRange){
			console.log("ageRange selected");
			console.log(_ageRange);
			ageRange.filter(_ageRange);
		});

		eventDispatcher.on('regionInput',function(_region){
			console.log("region selected");
			console.log(_region);
			region.filter(_region);
			console.log("Silver Premium")
			console.log(region.top(Infinity)[0].Silver);
		});




	});




}
