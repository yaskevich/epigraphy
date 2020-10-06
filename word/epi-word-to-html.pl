#!/usr/bin/perl
# (c) 2009, Sinan Ünür - original code 
# see here: http://stackoverflow.com/questions/1110409/how-can-i-programmatically-convert-word-doc-or-docx-files-into-text-files
# (c) 2012, Alayxey Yaskevich - slightly modified for Unicode use and support of command line arguments
# new versions and comments see here: http://alyaxey.com/word-convert-to-plain-text-in-utf
# (c) 2019, Alayxey Yaskevich - conversion to HTML

use strict;
use warnings;
# all additional modules are standard for ActiveState Perl for Windows (tested on v5.16.2, build 1602)
use File::Spec::Functions qw( catfile );
use Cwd;
use Time::HiRes;
use File::Basename;
use feature 'say';
use Win32::OLE;
use Win32::OLE::Const 'Microsoft Word';
$Win32::OLE::Warn = 3;

my $file_in		= $ARGV[0];

die "Source file is not set!\n" unless $file_in;
die "Source file doesn't exists!\n" unless (-e $file_in);

my @file = (fileparse($file_in, qr/\.[^.]*/));
my $file_out	= $ARGV[1] || $file[0]."(".substr(lc($file[2]), 1).").html";
my $pwd = cwd();

if ($file[1] eq '.\\') {	
	($file_in, $file_out) = (catfile ($pwd, $file_in), catfile ($pwd, $file_out));
} else {
	if ($file_out !~ m/[\\\/]/){
		$file_out = catfile $file[1], $file_out;
	}
}

# say $file_in;
	# if (-e $file_in) {
		# print "the file exists\n";
	# } 

# say $file_out;

# exit;

die "Text file already exists! Skipped.\n" if (-e $file_out);

my $time = Time::HiRes::time();

my $word = get_word_app();
$word->{Visible} = 0;
my $doc = $word->{Documents}->Open($file_in);

# print "Saving to: $file_out\n";
$doc->SaveAs(
    {	
	FileName => $file_out,
    # wdFormatTextLineBreaks
	# wdFormatUnicodeText
	# wdFormatEncodedText
	# wdFormatText
	# wdFormatUnicodeText
	# wdFormatDOSText
	
	# FileFormat=> wdFormatText, 	
	FileFormat=> wdFormatFilteredHTML, 	
	Encoding=> 65001
	}
);

$doc->Close(0);

sub get_word_app {
    my $word;
    eval { $word = Win32::OLE->GetActiveObject('Word.Application'); };
    die "$@\n" if $@;
    unless(defined $word) {
        $word = Win32::OLE->new('Word.Application', sub { $_[0]->Quit }) 
            or die "Oops, cannot start Microsoft Word application: ", Win32::OLE->LastError, "\n";
    }
    return $word;	
}

my $time2 = Time::HiRes::time;
print STDERR 'OK: '.sprintf("%.1f", $time2-$time).' sec ['.$file[0]."]\n"; 

__END__