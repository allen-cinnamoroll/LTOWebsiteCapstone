import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { Button } from '@/components/ui/button';

// Function to get recommended action based on violation type
const getViolationAction = (violationName) => {
  const violation = violationName?.toUpperCase() || '';
  const violationLower = violationName?.toLowerCase() || '';
  
  // License and Documentation Violations
  if (violation.includes('1A') || violation.includes("NO DRIVER'S LICENSE") || violation.includes("CONDUCTOR PERMIT")) {
    return 'Conduct mandatory license verification checkpoints at strategic locations. Implement driver education programs for unlicensed drivers. Increase penalties and mandatory license acquisition before vehicle release. Establish mobile licensing units in rural areas.';
  }
  
  if (violation.includes('1I') || violation.includes('FAILURE TO CARRY') || violationLower.includes('carry driver')) {
    return 'Launch awareness campaigns on importance of carrying valid documents. Implement digital license verification system. Conduct regular document checks at checkpoints. Provide reminders through mobile apps and SMS notifications.';
  }
  
  if (violation.includes('4-8') || violation.includes('UNAUTHORIZED/NO-LICENSE DRIVER')) {
    return 'Strengthen commercial vehicle operator verification. Require mandatory background checks for drivers. Implement real-time driver license verification system. Increase penalties for operators hiring unlicensed drivers.';
  }
  
  // Criminal Activity Violations
  if (violation.includes('1B') || violation.includes('DRIVING DURING CRIME')) {
    return 'Enhance coordination with law enforcement agencies. Implement immediate vehicle impoundment protocols. Strengthen background checks for vehicle registration. Establish rapid response units for criminal activity reports.';
  }
  
  if (violation.includes('1C') || violation.includes('CRIME DURING APPREHENSION')) {
    return 'Provide specialized training for traffic enforcers on handling dangerous situations. Implement body camera requirement for all enforcers. Establish emergency response protocols. Strengthen coordination with police departments.';
  }
  
  // DUI and Substance Abuse
  if (violation.includes('1D') || violation.includes('DRIVING UNDER THE INFLUENCE') || violation.includes('ALCOHOL') || violation.includes('DRUGS')) {
    return 'Implement zero-tolerance policy with immediate vehicle impoundment. Increase random breathalyzer and drug testing checkpoints. Launch nationwide anti-DUI campaigns. Mandatory alcohol/drug education programs for offenders. Establish rehabilitation programs for repeat offenders.';
  }
  
  // Reckless Driving
  if (violation.includes('1E') || violation.includes('RECKLESS DRIVING')) {
    return 'Increase penalties for reckless driving with mandatory license suspension. Implement mandatory defensive driving courses for repeat offenders. Deploy more traffic enforcers in high-risk areas. Install speed cameras and traffic monitoring systems.';
  }
  
  if (violation.includes('4-7') || violation.includes('RECKLESS/INSOLENT/ARROGANT DRIVER')) {
    return 'Implement behavior modification programs for commercial drivers. Strengthen penalties for insolent behavior. Require customer service training for public utility vehicle drivers. Establish complaint hotlines for passenger reports.';
  }
  
  // Fake Documents
  if (violation.includes('1F') || violation.includes('FAKE DOCUMENTS')) {
    return 'Implement document verification system with QR codes. Strengthen document authentication training for enforcers. Increase penalties for document forgery. Establish partnership with printing companies to prevent counterfeiting.';
  }
  
  if (violation.includes('1J40') || violation.includes('4-6') || violation.includes('FRAUDULENT DOCS')) {
    return 'Implement digital verification system for all documents. Strengthen document issuance security features. Conduct regular audits of document authenticity. Increase penalties and criminal charges for document fraud.';
  }
  
  // Seatbelt Violations
  if (violation.includes('1G1') || violation.includes('NO SEATBELT (DRIVER/FRONT')) {
    return 'Launch seatbelt awareness campaigns emphasizing driver and front passenger safety. Install seatbelt reminder systems in vehicles. Increase enforcement at checkpoints. Conduct educational programs in schools and communities.';
  }
  
  if (violation.includes('1G2') || violation.includes('NO SEATBELT (PASSENGER')) {
    return 'Strengthen seatbelt enforcement for rear passengers. Launch public awareness campaigns on passenger safety. Require seatbelt installation in all vehicle seats. Increase penalties for non-compliance.';
  }
  
  // Helmet Violations
  if (violation.includes('1H') || violation.includes('N1') || violation.includes('NOT WEARING HELMET')) {
    return 'Launch comprehensive helmet safety awareness campaigns. Distribute free or subsidized ICC-certified helmets in collaboration with motorcycle dealers. Enforce strict helmet laws at all checkpoints. Conduct helmet safety education programs in schools and communities.';
  }
  
  if (violation.includes('R.A 10054') || violation.includes('SUBSTANDARD HELMET') || violation.includes('NO ICC')) {
    return 'Launch awareness campaigns on ICC-certified helmet standards. Establish partnerships with helmet manufacturers for quality assurance. Conduct market inspections to remove substandard helmets. Provide subsidies for ICC-certified helmet purchases.';
  }
  
  if (violation.includes('N5-1') || violation.includes('FLIPFLOPS') || violation.includes('SANDALS') || violation.includes('SLIPPERS')) {
    return 'Launch footwear safety awareness campaigns for motorcycle riders. Emphasize proper protective footwear requirements. Increase enforcement at checkpoints. Provide educational materials on proper riding gear.';
  }
  
  // Parking Violations
  if (violation.includes('1J1') || violation.includes('ILLEGAL PARKING')) {
    return 'Improve parking infrastructure and signage in high-traffic areas. Implement smart parking systems with mobile payment. Increase enforcement in no-parking zones. Establish designated parking areas with clear markings.';
  }
  
  // Traffic Sign Violations
  if (violation.includes('1J2') || violation.includes('DISREGARDING TRAFFIC SIGNS')) {
    return 'Improve visibility and maintenance of traffic signs. Launch awareness campaigns on traffic sign recognition. Increase enforcement at intersections with traffic violations. Conduct driver education on traffic sign importance.';
  }
  
  // Passenger Safety Violations
  if (violation.includes('1J3') || violation.includes('PASSENGERS ON ROOF') || violation.includes('PASSENGERS ON HOOD')) {
    return 'Launch dangerous passenger position awareness campaigns. Increase enforcement in areas with cargo vehicles. Implement strict penalties for allowing passengers in unsafe positions. Conduct safety education for cargo vehicle operators.';
  }
  
  if (violation.includes('1J5') || violation.includes('PASSENGER ON RUNNING BOARD') || violation.includes('STEPBOARD') || violation.includes('MUDGUARD')) {
    return 'Strengthen enforcement of passenger safety regulations. Launch awareness campaigns on proper passenger seating. Increase penalties for operators allowing unsafe passenger positions. Conduct safety inspections of public utility vehicles.';
  }
  
  // Vehicle Safety Violations
  if (violation.includes('1J4') || violation.includes('NO CANVASS COVER')) {
    return 'Enforce mandatory canvass cover requirements for cargo vehicles. Conduct regular inspections of cargo vehicles. Launch awareness campaigns on cargo safety. Increase penalties for non-compliance.';
  }
  
  if (violation.includes('1J6') || violation.includes('HEADLIGHTS ARE NOT DIMMED')) {
    return 'Conduct vehicle lighting system awareness campaigns. Enforce mandatory headlight dimming requirements. Increase enforcement during night operations. Provide education on proper headlight usage.';
  }
  
  if (violation.includes('1J33') || violation.includes('LEAVING VEHICLE WITHOUT BRAKE')) {
    return 'Implement mandatory brake system checks during vehicle inspections. Launch awareness campaigns on proper vehicle parking procedures. Increase enforcement for improperly parked vehicles. Require driver training on vehicle safety procedures.';
  }
  
  // Traffic Direction Violations
  if (violation.includes('1J7') || violation.includes('DRIVING PROHIBITED AREA')) {
    return 'Improve road signage for prohibited areas. Increase enforcement in restricted zones. Launch awareness campaigns on area restrictions. Install barriers or markers in prohibited areas.';
  }
  
  if (violation.includes('1J9') || violation.includes('DRIVING AGAINST TRAFFIC')) {
    return 'Improve road markings and signage for one-way roads. Increase enforcement in areas with wrong-way violations. Install barriers to prevent wrong-way entry. Launch awareness campaigns on traffic direction importance.';
  }
  
  // Overtaking Violations (1J11-1J22)
  if (violation.includes('1J11') || violation.includes('ILLEGAL OVERTAKING')) {
    return 'Improve road markings for overtaking zones. Launch awareness campaigns on safe overtaking practices. Increase enforcement in areas with high overtaking violations. Install overtaking warning signs.';
  }
  
  if (violation.includes('1J12') || violation.includes('OVERTAKING AT UNSAFE DISTANCE')) {
    return 'Conduct driver education on safe following distances. Increase enforcement in areas with frequent accidents. Launch awareness campaigns on proper spacing. Require defensive driving courses.';
  }
  
  if (violation.includes('1J13') || violation.includes('CUTTING AN OVERTAKEN VEHICLE')) {
    return 'Strengthen enforcement of safe lane change practices. Launch awareness campaigns on proper lane changing. Increase penalties for dangerous lane cutting. Conduct driver education programs.';
  }
  
  if (violation.includes('1J14') || violation.includes('FAILURE TO GIVE WAY TO OVERTAKING')) {
    return 'Launch awareness campaigns on yielding to overtaking vehicles. Improve road markings for overtaking lanes. Increase enforcement in overtaking zones. Conduct driver education on road courtesy.';
  }
  
  if (violation.includes('1J15') || violation.includes('SPEEDING WHEN OVERTAKEN')) {
    return 'Increase enforcement of speed limits during overtaking. Launch awareness campaigns on speed control. Install speed cameras in overtaking zones. Require speed awareness training.';
  }
  
  if (violation.includes('1J16') || violation.includes('OVERTAKING WITHOUT CLEAR VIEW')) {
    return 'Improve road visibility through better lighting and signage. Launch awareness campaigns on safe overtaking conditions. Increase enforcement in areas with poor visibility. Require driver education on visibility requirements.';
  }
  
  if (violation.includes('1J17') || violation.includes('OVERTAKING UPON CREST')) {
    return 'Install warning signs at crest locations. Increase enforcement at grade areas. Launch awareness campaigns on dangerous overtaking locations. Require defensive driving courses.';
  }
  
  if (violation.includes('1J18') || violation.includes('OVERTAKEN UPON A CURVE')) {
    return 'Improve road markings and signage at curves. Increase enforcement at curve locations. Launch awareness campaigns on curve safety. Install curve warning systems.';
  }
  
  if (violation.includes('1J19') || violation.includes('OVERTAKING AT RAILWAY GRADE')) {
    return 'Strengthen enforcement at railway crossings. Install warning systems at railway crossings. Launch awareness campaigns on railway crossing safety. Require mandatory stop at railway crossings.';
  }
  
  if (violation.includes('1J20') || violation.includes('OVERTAKING AT AN INTERSECTION')) {
    return 'Improve intersection markings and signage. Increase enforcement at intersections. Launch awareness campaigns on intersection safety. Install intersection warning systems.';
  }
  
  if (violation.includes('1J21') || violation.includes('OVERTAKING ON MEN WORKING')) {
    return 'Strengthen enforcement in construction zones. Improve signage at work sites. Launch awareness campaigns on work zone safety. Require mandatory speed reduction in work zones.';
  }
  
  if (violation.includes('1J22') || violation.includes('OVERTAKING AT NO OVERTAKING ZONE')) {
    return 'Improve visibility of no-overtaking zone markings. Increase enforcement in no-overtaking zones. Install barriers or markers in restricted zones. Launch awareness campaigns on zone restrictions.';
  }
  
  // Right of Way Violations (1J23-1J29)
  if (violation.includes('1J23') || violation.includes('FAILURE TO YIELD TO VEHICLE ON RIGHT')) {
    return 'Launch awareness campaigns on right-of-way rules. Improve intersection markings. Increase enforcement at intersections. Conduct driver education on yielding procedures.';
  }
  
  if (violation.includes('1J24') || violation.includes('FAILURE TO YIELD IN INTERSECTION')) {
    return 'Improve intersection traffic control systems. Launch awareness campaigns on intersection yielding. Increase enforcement at busy intersections. Install yield signs and markings.';
  }
  
  if (violation.includes('1J25') || violation.includes('FAILURE TO YIELD TO PEDESTRIAN')) {
    return 'Install pedestrian crossing systems and signals. Launch awareness campaigns on pedestrian rights. Increase enforcement at pedestrian crossings. Require driver education on pedestrian safety.';
  }
  
  if (violation.includes('1J26') || violation.includes('FAILURE TO STOP AT HIGHWAY/RAILROAD')) {
    return 'Strengthen enforcement at highway and railway crossings. Install stop signs and warning systems. Launch awareness campaigns on crossing safety. Require mandatory stop procedures.';
  }
  
  if (violation.includes('1J27') || violation.includes('FAILURE TO YIELD ENTERING HIGHWAY')) {
    return 'Improve signage at highway entrances. Launch awareness campaigns on highway entry procedures. Increase enforcement at highway entrances. Install yield signs and markings.';
  }
  
  if (violation.includes('1J28') || violation.includes('FAILURE TO YIELD TO EMERGENCY VEHICLE')) {
    return 'Launch awareness campaigns on yielding to emergency vehicles. Increase enforcement when emergency vehicles are present. Require driver education on emergency vehicle procedures. Strengthen penalties for non-compliance.';
  }
  
  if (violation.includes('1J29') || violation.includes('FAILURE TO YIELD AT STOP/THRU')) {
    return 'Improve stop sign and through traffic markings. Launch awareness campaigns on stop sign compliance. Increase enforcement at stop intersections. Install traffic control systems.';
  }
  
  // Signaling and Lane Violations
  if (violation.includes('1J30') || violation.includes('IMPROPER SIGNALING')) {
    return 'Launch awareness campaigns on proper signaling procedures. Increase enforcement of signaling violations. Require driver education on signaling importance. Install signal reminder systems.';
  }
  
  if (violation.includes('1J31') || violation.includes('ILLEGAL TURN, NOT KEEPING TO RIGHT')) {
    return 'Improve lane markings for turns. Launch awareness campaigns on proper lane positioning. Increase enforcement at turn intersections. Install turn lane markers.';
  }
  
  if (violation.includes('1J32') || violation.includes('ILLEGAL TURN, IMPROPER LANE USE')) {
    return 'Improve lane markings and signage. Launch awareness campaigns on proper lane usage. Increase enforcement at intersections. Require driver education on lane discipline.';
  }
  
  if (violation.includes('1J10') || violation.includes('ILLEGAL LEFT TURN')) {
    return 'Improve signage for turn restrictions. Increase enforcement at restricted turn intersections. Launch awareness campaigns on turn regulations. Install turn restriction markers.';
  }
  
  // Towing and Vehicle Operations
  if (violation.includes('1J34') || violation.includes('UNSAFE TOWING')) {
    return 'Enforce mandatory towing safety standards. Launch awareness campaigns on safe towing practices. Require towing equipment inspections. Increase penalties for unsafe towing.';
  }
  
  if (violation.includes('1J35') || violation.includes('OBSTRUCTION')) {
    return 'Improve road maintenance and clearance procedures. Launch awareness campaigns on proper vehicle parking. Increase enforcement of obstruction violations. Require proper vehicle positioning.';
  }
  
  // Commercial Vehicle Violations - Passenger/Cargo
  if (violation.includes('1J36') || violation.includes('EXCESS PASSENGERS') || violation.includes('EXCESS CARGO')) {
    return 'Conduct regular inspections of passenger and cargo loads. Launch awareness campaigns on load limits. Increase enforcement at checkpoints. Require load monitoring systems.';
  }
  
  if (violation.includes('1J37') || violation.includes('4-2') || violation.includes('REFUSAL TO ACCEPT PASSENGER')) {
    return 'Strengthen enforcement of passenger acceptance policies. Establish complaint hotlines for passenger reports. Launch awareness campaigns on passenger rights. Require mandatory passenger acceptance training.';
  }
  
  if (violation.includes('1J38') || violation.includes('4-3') || violation.includes('OVERCHARGING') || violation.includes('UNDERCHARGING')) {
    return 'Implement fare monitoring systems with digital displays. Launch awareness campaigns on proper fare collection. Establish complaint mechanisms for fare disputes. Increase penalties for fare violations.';
  }
  
  if (violation.includes('1J39') || violation.includes('4-5') || violation.includes('NO FRANCHISE') || violation.includes('CPC')) {
    return 'Strengthen enforcement of franchise requirements. Conduct regular franchise verification. Launch awareness campaigns on franchise importance. Increase penalties for colorum operations.';
  }
  
  if (violation.includes('1J41') || violation.includes('4-9') || violation.includes('OPERATING WITH DEFECTIVE PARTS')) {
    return 'Implement mandatory vehicle inspection programs. Require repair before vehicle operation. Conduct regular safety inspections. Launch awareness campaigns on vehicle maintenance.';
  }
  
  if (violation.includes('1J42') || violation.includes('4-10') || violation.includes('FAILURE TO PROVIDE FARE DISCOUNT')) {
    return 'Launch awareness campaigns on passenger fare discount rights. Establish complaint mechanisms for discount violations. Strengthen enforcement of discount policies. Require mandatory discount training.';
  }
  
  if (violation.includes('1J43') || violation.includes('4-13') || violation.includes('FAULTY TAXIMETER')) {
    return 'Implement mandatory taximeter calibration and inspection. Launch awareness campaigns on taximeter accuracy. Increase penalties for faulty taximeters. Require regular taximeter maintenance.';
  }
  
  if (violation.includes('1J44') || violation.includes('4-14') || violation.includes('TAMPERED SEALING WIRE')) {
    return 'Strengthen enforcement of tampering violations. Conduct regular sealing wire inspections. Launch awareness campaigns on tampering consequences. Increase penalties for tampering.';
  }
  
  if (violation.includes('1J45') || violation.includes('4-18') || violation.includes('NO SIGNBOARD')) {
    return 'Enforce mandatory signboard requirements. Launch awareness campaigns on signboard importance. Conduct regular signboard inspections. Require proper signboard installation.';
  }
  
  if (violation.includes('1J46') || violation.includes('4-19') || violation.includes('ILLEGAL PICK/DROP')) {
    return 'Improve designated pick-up and drop-off areas. Launch awareness campaigns on proper pick/drop locations. Increase enforcement at restricted areas. Install clear signage for pick/drop zones.';
  }
  
  if (violation.includes('1J47') || violation.includes('4-20') || violation.includes('ILLEGAL CARGOES')) {
    return 'Strengthen enforcement of cargo regulations. Launch awareness campaigns on prohibited cargoes. Conduct regular cargo inspections. Increase penalties for illegal cargo transport.';
  }
  
  if (violation.includes('1J48') || violation.includes('4-21') || violation.includes('MISSING FIRE EXTINGUISHER')) {
    return 'Enforce mandatory fire safety equipment requirements. Conduct regular safety equipment inspections. Launch awareness campaigns on fire safety. Require mandatory safety equipment training.';
  }
  
  if (violation.includes('1J49') || violation.includes('4-22') || violation.includes('TRIP CUTTING')) {
    return 'Implement trip monitoring systems. Launch awareness campaigns on trip completion requirements. Strengthen enforcement of trip violations. Establish complaint mechanisms for passengers.';
  }
  
  if (violation.includes('1J50') || violation.includes('4-23') || violation.includes('FAILURE TO DISPLAY FARE MATRIX')) {
    return 'Enforce mandatory fare matrix display. Launch awareness campaigns on fare transparency. Conduct regular fare matrix inspections. Require clear and visible fare displays.';
  }
  
  if (violation.includes('1J51') || violation.includes('4-25') || violation.includes('BREACH OF FRANCHISE')) {
    return 'Strengthen franchise compliance monitoring. Launch awareness campaigns on franchise terms. Conduct regular franchise audits. Increase penalties for franchise breaches.';
  }
  
  // Colorum Operations
  if (violation.includes('4-1') || violation.includes('COLORUM OPERATION')) {
    return 'Strengthen enforcement against unauthorized operations. Conduct regular franchise verification. Launch awareness campaigns on legal operation requirements. Increase penalties and vehicle impoundment for colorum operations.';
  }
  
  if (violation.includes('4-4') || violation.includes('MISSING BODY MARKINGS')) {
    return 'Enforce mandatory body marking requirements. Launch awareness campaigns on body marking importance. Conduct regular body marking inspections. Require proper body marking installation.';
  }
  
  if (violation.includes('4-11') || violation.includes('WRONG OPERATOR INFO')) {
    return 'Strengthen operator information verification. Launch awareness campaigns on correct operator registration. Conduct regular operator information audits. Require mandatory information updates.';
  }
  
  if (violation.includes('4-12') || violation.includes('MISSING/ALLOWING SMOKING')) {
    return 'Enforce mandatory no-smoking policies in vehicles. Launch awareness campaigns on smoke-free transportation. Strengthen enforcement of smoking violations. Require no-smoking signage.';
  }
  
  if (violation.includes('4-15') || violation.includes('UNAUTHORIZED COLOR/DESIGN')) {
    return 'Enforce authorized color and design requirements. Launch awareness campaigns on authorized vehicle appearance. Conduct regular appearance inspections. Require approval for design changes.';
  }
  
  if (violation.includes('4-17') || violation.includes('NO PANEL ROUTE')) {
    return 'Enforce mandatory panel route display. Launch awareness campaigns on route information importance. Conduct regular panel route inspections. Require clear and visible route displays.';
  }
  
  if (violation.includes('4-24') || violation.includes('MISSING PWD/ACCESS SYMBOLS')) {
    return 'Enforce mandatory accessibility symbol requirements. Launch awareness campaigns on accessibility importance. Conduct regular accessibility inspections. Require proper accessibility markings.';
  }
  
  // Vehicle Registration Violations
  if (violation.includes('2A') || violation.includes('UNREGISTERED MV')) {
    return 'Establish mobile registration units in high-traffic areas. Provide incentives for early registration renewal. Increase enforcement in unregistered vehicle hotspots. Launch awareness campaigns on registration importance.';
  }
  
  if (violation.includes('2B') || violation.includes('UNAUTHORIZED MV MODIFICATION')) {
    return 'Enforce vehicle modification regulations. Require modification permits and inspections. Conduct awareness campaigns on legal vehicle modifications. Increase penalties for unauthorized modifications.';
  }
  
  if (violation.includes('2C') || violation.includes('RIGHT-HAND DRIVE MV')) {
    return 'Strengthen enforcement against right-hand drive vehicles. Launch awareness campaigns on right-hand drive prohibition. Conduct regular vehicle inspections. Increase penalties for right-hand drive operation.';
  }
  
  if (violation.includes('2D') || violation.includes('OPERATING WITH DEFECTIVE PARTS')) {
    return 'Implement mandatory vehicle inspection programs. Require repair before vehicle registration renewal. Conduct vehicle safety awareness campaigns. Increase penalties for defective vehicle operation.';
  }
  
  if (violation.includes('2E') || violation.includes('IMPROPER PLATES/STICKER')) {
    return 'Strengthen plate and sticker verification. Launch awareness campaigns on proper plate/sticker installation. Conduct regular plate/sticker inspections. Increase penalties for improper display.';
  }
  
  if (violation.includes('2G') || violation.includes('FRAUD IN REGISTRATION/RENEWAL')) {
    return 'Implement digital verification system for registration documents. Strengthen document authentication procedures. Conduct regular registration audits. Increase penalties and criminal charges for fraud.';
  }
  
  if (violation.includes('2H') || violation.includes('OTHER MV VIOLATIONS')) {
    return 'Conduct review of other vehicle violations patterns. Increase enforcement of miscellaneous violations. Launch awareness campaigns on vehicle compliance. Implement targeted interventions based on violation trends.';
  }
  
  // Overloading Violations
  if (violation.includes('3A') || violation.includes('OVERWIDTH LOAD')) {
    return 'Implement mandatory load width measurements. Launch awareness campaigns on load width limits. Conduct regular load inspections. Require proper load securing.';
  }
  
  if (violation.includes('3B') || violation.includes('AXLE OVERLOADING')) {
    return 'Install weighbridge stations at key locations. Launch awareness campaigns on axle load limits. Conduct regular axle load inspections. Require load distribution education.';
  }
  
  if (violation.includes('3C') || violation.includes('BUS/TRUCK OVERLOADED WITH CARGO')) {
    return 'Strengthen enforcement of cargo load limits. Launch awareness campaigns on overload dangers. Conduct regular cargo load inspections. Require load monitoring systems.';
  }
  
  // Anti-Distracted Driving Act
  if (violation.includes('RA 10913') || violation.includes('ANTI-DISTRACTED DRIVING')) {
    return 'Enforce hands-free device requirements strictly. Increase penalties for mobile phone use while driving. Launch nationwide distracted driving awareness campaigns. Install warning signs in high-traffic areas. Require mandatory distracted driving education.';
  }
  
  // Children's Safety on Motorcycles Act
  if (violation.includes('RA 10666') || violation.includes("CHILDREN'S SAFETY ON MOTORCYCLES")) {
    return 'Launch awareness campaigns on children motorcycle safety requirements. Enforce age and height restrictions for child passengers. Strengthen enforcement at checkpoints. Require mandatory child safety equipment. Conduct educational programs in schools.';
  }
  
  // Smoke Belching
  if (violation.includes('RA 78749') || violation.includes('2F') || violation.includes('SMOKE BELCHING')) {
    return 'Strengthen emission testing requirements. Conduct regular smoke emission tests. Launch awareness campaigns on environmental protection. Require mandatory vehicle maintenance for emission control. Increase penalties for smoke belching violations.';
  }
  
  // Default action for unrecognized violations
  return 'Increase enforcement and public awareness campaigns. Conduct regular review of violation patterns. Implement targeted interventions based on violation trends. Strengthen coordination between enforcement units.';
};

export function ViolationPrescriptionTable({ displayData, loading, totalViolations }) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Get violations data
  const violations = displayData?.mostCommonViolations || [];
  
  // Calculate percentage for each violation
  const violationsWithPercentage = violations.map(violation => {
    const percentage = totalViolations > 0 
      ? ((violation.count || 0) / totalViolations) * 100 
      : 0;
    const isHighPriority = percentage >= 50;
    
    return {
      ...violation,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      isHighPriority,
      action: getViolationAction(violation._id)
    };
  });
  
  // Sort by percentage (highest first)
  const sortedViolations = [...violationsWithPercentage].sort((a, b) => b.percentage - a.percentage);
  
  // Pagination calculations
  const totalPages = Math.ceil(sortedViolations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentViolations = sortedViolations.slice(startIndex, endIndex);
  
  // Pagination handlers
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  
  const handlePageClick = (page) => {
    setCurrentPage(page);
  };
  
  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [displayData?.mostCommonViolations]);
  
  if (loading) {
    return (
      <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 mb-8`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (!violations || violations.length === 0) {
    return (
      <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 mb-8`}>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Violation Prescription & Action Plan
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          No violation data available
        </p>
      </div>
    );
  }
  
  return (
    <div className={`${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-200'} border rounded-xl shadow-lg p-6 mb-8`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingDown className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Violation Prescription & Action Plan
          </h2>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total Violations: <span className="font-semibold text-gray-900 dark:text-white">{totalViolations.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>Priority Alert:</strong> Violations with 50% or higher occurrence rate are marked as <strong>HIGH PRIORITY</strong> and require immediate action from LTO.
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Violation
              </th>
              <th className={`text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Occurrences
              </th>
              <th className={`text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Percentage
              </th>
              <th className={`text-center py-3 px-4 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Priority
              </th>
              <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Recommended Action
              </th>
            </tr>
          </thead>
          <tbody>
            {currentViolations.map((violation, index) => (
              <tr 
                key={violation._id || index}
                className={`border-b ${isDarkMode ? 'border-gray-800 hover:bg-gray-900/50' : 'border-gray-200 hover:bg-gray-50'} transition-colors`}
              >
                <td className="py-4 px-4">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {violation._id || 'N/A'}
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {violation.count?.toLocaleString() || '0'}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {violation.percentage.toFixed(2)}%
                    </span>
                    <div className={`w-16 h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                      <div 
                        className={`h-full transition-all duration-500 ${
                          violation.isHighPriority 
                            ? 'bg-gradient-to-r from-red-500 to-red-600' 
                            : violation.percentage >= 25
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                            : 'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                        style={{ width: `${Math.min(violation.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  {violation.isHighPriority ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-700">
                      <AlertTriangle className="h-3 w-3" />
                      HIGH
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700">
                      <CheckCircle className="h-3 w-3" />
                      NORMAL
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300 max-w-md">
                    {violation.action}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedViolations.length)} of {sortedViolations.length} violations
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="border-gray-300 dark:border-gray-600"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      onClick={() => handlePageClick(page)}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className={`min-w-[40px] ${
                        currentPage === page
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {page}
                    </Button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} className="px-2 text-gray-500 dark:text-gray-400">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>
            
            <Button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="border-gray-300 dark:border-gray-600"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {sortedViolations.filter(v => v.isHighPriority).length > 0 && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-red-900 dark:text-red-300 mb-1">
                Immediate Action Required
              </div>
              <div className="text-sm text-red-800 dark:text-red-400">
                {sortedViolations.filter(v => v.isHighPriority).length} violation(s) require immediate attention. 
                These violations represent 50% or more of all recorded violations and should be prioritized in LTO action plans.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

