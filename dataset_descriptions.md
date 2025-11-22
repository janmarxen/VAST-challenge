# /Activity Logs

ParticipantStatusLogs<n>.csv
Contains information about the status of each of the ~1,000 participants over the duration of
the 15-month data collection period, recorded in 5-minute increments. This data (~18Gb) is split
across 72 files.

```
● timestamp( datetime ): the time when the status waslogged
● currentLocation( point ): the location of the participantwithin the city at the time
the status was logged
● participantId( integer ): unique ID assigned to eachparticipant
● currentMode( string ): a string representing the modethe participant is in at the time
the status was logged, one of {"AtHome", "Transport", "AtRecreation", "AtRestaurant",
"AtWork" }.
● hungerStatus( string ): a string representing the participant’shunger status at the
time the status was logged
● sleepStatus( string ): a string representing the participant’ssleep status at the time
the status was logged
● apartmentId( integer ): the integer ID correspondingto the apartment in which the
participant resides at the time the status was logged
● availableBalance( float ): the balance in the participant’sfinancial account
(negative if in debt)
● jobId( integer ): the integer ID corresponding to thejob the participant holds at the
time the status was logged, N/A if unemployed
● financialStatus( string ): a string representing theparticipant’s sleep status at the
time the status was logged
● dailyFoodBudget( double ): the amount of money theparticipant has budgeted for
food that day
● weeklyExtraBudget( double ): the amount of money theparticipant has budgeted
for miscellaneous expenses that week
```

# /Attributes

Apartments.csv
Contains information about residential apartments in the city

```
● apartmentId( integer ): unique ID assigned to eachapartment
● rentalCost( float ): the monthly rent for the apartment
● maxOccupancy( integer ): the maximum number of occupantsthe apartment can
accommodate at one time
● numberOfRooms( integer ): the number of rooms in theapartment
● location( point ): the geographic location of the apartment(used for mapping)
● buildingId( integer ): the integer ID correspondingto the building in which the
apartment is located
```
Buildings.csv
Contains information about the buildings in the city that were involved in this study; this
includes commercial, residential and school properties.

```
● buildingId( integer ): unique ID assigned to each building
● location( polygon ): the geographic footprint of thebuilding (used for mapping)
● buildingType( string factor ): one of {"Commercial","Residential", "School"}
● maxOccupancy( integer ): the maximum number of occupantsthe building can
accommodate at one time (if applicable) – blank otherwise
● units( list of integer IDs ): a list of apartment,workplace, or school IDs corresponding
to locations within the specific building.
```
Employers.csv
Contains information about the companies and businesses within the city limits that either
employ study participants, or which have available job openings.

```
● employerId( integer ): unique ID assigned to each employer
● location( point ): the geographic location of the employer(used for mapping)
● buildingId( integer ): the integer ID correspondingto the building in which the
employer is located
```

Jobs.csv
Contains information about employment opportunities available in the city at the start of the
study. Some of these jobs are held by participants at the start of the study, while others are
open positions.

```
● jobId( integer ): unique ID assigned to each job
● employerId( integer ): the integer ID correspondingto the employer affiliated with
this job
● hourlyRate( double ): the hourly wage paid to thisposition
● startTime( datetime ): the daily start time for thisposition
● endTime( datetime ): the daily end time for this position
● daysToWork( list of weekdays ): which days of the weekthis position runs
● educationRequirement( string factor ): the minimumeducation level required to
hold this position, one of: {"Low", "HighSchoolOrCollege", "Bachelors", "Graduate"}
```
Participants.csv
Contains information about the residents of Engagement, OH that have agreed to participate in
this study.

```
● participantId( integer ): unique ID assigned to eachparticipant
● householdSize( integer ): the number of people in theparticipant’s household
● haveKids( boolean ): whether there are children livingin the participant’s household
● age( integer ): participant’s age in years at the startof the study
● educationLevel( string factor ): the participant’seducation level, one of:
{"Low", "HighSchoolOrCollege", "Bachelors", "Graduate"}
● interestGroup( char ): a char representing the participant’sstated primary interest
group, one of {"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"}. Note: specific topics of
interest have been redacted to avoid bias.
● joviality( float ): a value ranging from [0,1] indicatingthe participant’s overall
happiness level at the start of the study.
```
Pubs.csv
Contains information about the pubs within the city limits.

```
● pubId( integer ): unique ID assigned to each pub
● hourlyCost( float ): the hourly cost to visit thispub. Note: Engagement City Blue Laws
forbid offering per-drink discounts, but limited-scope wine and beer tastings billed
hourly are permitted.
● maxOccupancy( integer ): the maximum number of occupantsthe restaurant can
accommodate at one time
● location( point ): the geographic location of the pub(used for mapping)
● buildingId( integer ): the integer ID correspondingto the building in which the pub is
located
```

Restaurants.csv
Contains information about the restaurants within the city limits.

```
● restaurantId( integer ): unique ID assigned to eachrestaurant
● foodCost( float ): the Prix Fixe cost for study participantsto dine at this restaurant
● maxOccupancy( integer ): the maximum number of occupantsthe restaurant can
accommodate at one time
● location( point ): the geographic location of the restaurant(used for mapping)
● buildingId( integer ): the integer ID correspondingto the building in which the
restaurant is located
```
Schools.csv
Contains information about the city’s five schools.
● schoolId( _integer_ ): unique ID assigned to each school
● monthlyFees( _float_ ): the monthly cost associated withattending this school
● maxEnrollment( _integer_ ): the maximum number of studentsthe school can
accommodate at one time
● location( _point_ ): the geographic location of the school(used for mapping)
● buildingId( _integer_ ): the integer ID correspondingto the building in which the
school is located


# /Journals

CheckinJournal.csv
Contains information about participants’ check-ins at various locations. This provides a
compressed summary of the key location-event information contained in the Participant
Logs.

```
● participantId( integer ): unique ID assigned to eachparticipant
● timestamp( datetime ): the time when the check-in waslogged
● venueId( integer ): unique ID corresponding to thecheck-in location
● venueType( string factor ): a string describing thevenue type, one of
{“Apartment”, “Pub”, “Restaurant”, “Workplace”}
```
FinancialJournal.csv
Contains information about financial transactions.

```
● participantId( integer ): unique ID corresponding tothe participant affected
● timestamp( datetime ): the time when the check-in waslogged
● category( string factor ): a string describing theexpense category, one of
{“Education”, “Food”, “Recreation”, “RentAdjustment”, “Shelter”, “Wage”}
● amount( double ): the amount of the transaction
```
SocialNetwork.csv
Contains information about participants’ evolving social relationships.

```
● timestamp( datetime ): the time when the check-in waslogged
● participantIdFrom( int ): unique ID corresponding tothe participant initiating the
interaction
● participantIdTo( int ): unique ID corresponding tothe participant who is the target
of the interaction
```
TravelJournal.csv
Contains information about participants’ motivation for movement around the city. This
provides a compressed summary and additional context regarding location-event and
financial transaction information contained in the Participant Logs.

```
● participantId( integer ): unique ID corresponding tothe participant in question
● travelStartTime( datetime ): the time when the participantstarted traveling
● travelStartLocationId( integer ): the unique ID correspondingto the location
the participant is leaving when they begin to travel, NA if unknown
● travelEndTime( datetime ): the time when the participantconcluded their travel
```

● travelEndLocationId( _integer_ ): the unique ID corresponding to the location the
participant is traveling to
● purpose( _string factor_ ): a description of the purposefor the recorded travel, one of:
{“Coming Back From Restaurant”, “Eating”, “Going Back to Home”, “Recreation (Social
Gathering)”, “Work/Home Commute”}
● checkInTime( _datetime_ ): the time when the participantchecked in to their
destination
● checkOutTime( _datetime_ ): the time when the participantleft their destination
● startingBalance( _double_ ): the participant’s startingbalance at the beginning
of their travels
● endingBalance( _double_ ): the participant’s ending balanceat the conclusion of
their travels


