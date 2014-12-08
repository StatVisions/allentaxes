function allen(maxPremiumCapTable,silverRateTable){
	
	var setHouseholdSize = 1; 
	var setAGI = 25000;
	var eventDispatcher = d3.dispatch("householdInput","agiInput","calc","calcAlternate","ageRangeInput","regionInput");
	var userInput = {}; // stores input and made available to internal functions
	var format = d3.format(",d");
	var formatP = d3.format(",.2%");

	agiText(setAGI);
 
	//////////////////////////////////////////////////////
	// Mex Premium Calculation
	//////////////////////////////////////////////////////

	d3.csv(maxPremiumCapTable,function(data){

		setMaxAGI(data,setHouseholdSize);

		// set up bracket indexes for each house hold size, 1-6
		var j = 1;
		for (var i = 0; i < data.length ; i++) {
			data[i].Low == 0 ? j = 1 : j++;
			data[i].bracket = j;
		};

		var xf = crossfilter().add(data);
		var householdSize = xf.dimension(function(d){return +d.Size});
		var rateDimension = xf.dimension(function(d){return +d.Rate});
		var agiDimension = xf.dimension(function(d){return [+d.Low,+d.High]});

		var rateList = [];
		for(var k = 0; k < 6; k++) {
			rateList[k] = data[k].Rate;
		}
		
		console.log("rateList");
		console.log(rateList);

		userInput.householdSize = setHouseholdSize;
		userInput.agi = setAGI;
		userInput.agiHouseholdMax = getMaxAGI(data,userInput.householdSize);



		d3.select("#householdSize").on("input", function() {
  			eventDispatcher.householdInput(+this.value);
		});


		d3.select("#agi").on("input",function(){
			eventDispatcher.agiInput(+this.value);
		});

		eventDispatcher.on('householdInput',function(_size){
			console.log('Household Size');
			householdSizeText(_size);
			householdSize.filter(_size);
			userInput.householdSize = _size;
			setMaxAGI(data,_size);
			userInput.agiHouseholdMax = getMaxAGI(data,_size); // <- optimize
			eventDispatcher.agiInput(userInput.agi);
		});


		eventDispatcher.on('agiInput',function(_agi){
			console.log('Adjusted Gross Income')
			userInput.agi = _agi;
			if(_agi >= 0 && _agi <= userInput.agiHouseholdMax){
				agiDimension.filterFunction(agiBracket(_agi));
				agiText(_agi);
				eventDispatcher.calc();
			} else {

				eventDispatcher.calcAlternate(_agi);
			}

			eventDispatcher.regionInput(userInput.Region);
		});
			
		eventDispatcher.on('calc',function(){
			var rateBrackets = rateDimension.bottom(Infinity);
			// set agi bracket
			userInput.Bracket = rateBrackets[0].bracket;
			medicade(userInput.Bracket);
			var premiumCap = rateBrackets[0].Rate;
			console.log('Premium Cap');
			rateText(premiumCap);
			userInput.premiumCap = premiumCap;
			
			if(rateBrackets[0].Low!=0){

				var lowerBracket = rateBrackets[0].Low;
				// get next lowest bracket
				var iA = +userInput.Bracket -2;
			    userInput.premiumCapLower = rateList[iA];

				if(userInput.Bracket == 6){
					// highest two brackets have identical rates
					// so factor adjustment is necessary
					var lowerBracket = .625*userInput.agiHouseholdMax;
					 userInput.premiumCapLower = rateList[3];
				}
				
				var _reduceAgi = userInput.agi - lowerBracket;
				userInput.lowerBracket = lowerBracket;

				userInput.reduceAGI = _reduceAgi;
				reduceAgiText(_reduceAgi);
			} else { 
				userInput.premiumCapLower = 0;
				reduceAgiText(0)}
		});

		eventDispatcher.on('calcAlternate',function(_agi){
			console.log('Premium Cap Alternate');
			userInput.Bracket = undefined;
			userInput.premiumCapLower = rateList[5];
			medicade(userInput.Bracket);
			rateText(1);
			userInput.premiumCap = 1;
			var _reduceAgi = _agi - userInput.agiHouseholdMax;
			userInput.reduceAGI = _reduceAgi;
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
		d3.select("#rate-value").text(formatP(_rate));
	};

	function reduceAgiText(_agiReduction){
		d3.select("#lowerAGI-value").text(format(_agiReduction));
	};

	function medicade(_bracket){
		d3.select("div#medicade").transition().style("opacity",_bracket==1 ? 1:0);
		if(_bracket==1) d3.select("div#medicade").style("display","block");
		if(_bracket!=1) d3.select("div#medicade").style("display","none");
	}

	function householdSizeText(_size){
		d3.select("#householdSize").property("value",_size);
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
		userInput.region = uniqueRegions[0];
		userInput.ageRange = uniqueAgeRanges[0];

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
			ageRange.filterAll();
			console.log("Age Range of Primary");
			ageRange.filter(_ageRange);
			userInput.premium  = ageRange.top(Infinity)[0].Silver;
			userInput.ageRange = _ageRange;
			d3.select("#SilverPremium").text(format(userInput.premium));
			d3.select("#SilverPremiumX12").text(format(Math.floor(userInput.premium*12)));
			premiumCredit();
		});

		eventDispatcher.on('regionInput',function(_region){
			region.filterAll();
			console.log("Region");
			region.filter(_region);
			userInput.premium = region.top(Infinity)[0].Silver;
			d3.select("#SilverPremium").text(format(userInput.premium));
			d3.select("#SilverPremiumX12").text(format(Math.floor(userInput.premium*12)));
			userInput.premiumAnnual = userInput.premium*12;
			userInput.region = _region;
			premiumCredit();
		});

		function premiumCredit(){
			d3.select("#AGIxPremiumCap").text(format(Math.floor(userInput.premiumCap*userInput.agi)));
			userInput.premiumCapDollars = userInput.premiumCap*userInput.agi;
			var credit = userInput.premium*12- userInput.premiumCapDollars;
			console.log('Premium Credit');
			if(userInput.premiumCap==1) credit = 0;
			credit = d3.max([0,credit]);
			userInput.premiumCredit = credit;
			d3.select("#premiumCredit").text(format(Math.floor(credit)));
			console.log(userInput);

			var creditLower = userInput.premium*12- userInput.premiumCapLower*userInput.lowerBracket;
			userInput.premiumCreditLowerFPL = creditLower;
			d3.select("#lowerAGIPremiumCredit-value").text(format(Math.floor(creditLower)));
			d3.select("#lowerAGIBracket-value").text(format(userInput.lowerBracket));
			d3.select("#premiumCapLower-value").text(formatP(userInput.premiumCapLower));
			d3.select("#lowerAGIBracktXlowerPremiumCap-value").text(format(Math.floor(userInput.lowerBracket*userInput.premiumCapLower)));
		}
		eventDispatcher.ageRangeInput(uniqueAgeRanges[0]);
		eventDispatcher.regionInput(uniqueRegions[0]);
		

	});




}
